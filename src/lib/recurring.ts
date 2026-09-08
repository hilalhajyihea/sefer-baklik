import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/availability";
import { combineDateAndTime, toDateKey } from "@/lib/time";
import { isTeamMode } from "@/lib/staff";

export type RecurringInterval =
  | "WEEKLY"
  | "BIWEEKLY"
  | "TRIWEEKLY"
  | "MONTHLY";

/** How far ahead to materialize open-ended series (keeps calendars tidy). */
export const RECURRING_HORIZON_DAYS = 84;
const MAX_OCCURRENCES_PER_PASS = 40;

export function addIntervalToDateKey(
  dateKey: string,
  interval: RecurringInterval,
): string {
  const noon = combineDateAndTime(dateKey, "12:00");
  if (interval === "MONTHLY") {
    const [y, m, d] = dateKey.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const days =
    interval === "WEEKLY" ? 7 : interval === "BIWEEKLY" ? 14 : 21;
  return toDateKey(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const noon = combineDateAndTime(dateKey, "12:00");
  return toDateKey(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000));
}

export function listOccurrenceDateKeys(input: {
  startDateKey: string;
  /** Inclusive cap; for open-ended use a rolling horizon end */
  untilDateKey: string;
  interval: RecurringInterval;
  /** Skip cadence ticks strictly before this (keeps long-lived series cheap) */
  fromDateKey?: string;
}): string[] {
  const keys: string[] = [];
  let cursor = input.startDateKey;
  const from = input.fromDateKey ?? input.startDateKey;
  let guard = 0;
  while (cursor < from && guard < 600) {
    cursor = addIntervalToDateKey(cursor, input.interval);
    guard += 1;
  }
  while (cursor <= input.untilDateKey && keys.length < MAX_OCCURRENCES_PER_PASS) {
    keys.push(cursor);
    cursor = addIntervalToDateKey(cursor, input.interval);
  }
  return keys;
}

function horizonUntilDateKey(startDateKey: string) {
  const today = toDateKey();
  const base = startDateKey > today ? startDateKey : today;
  return addDaysToDateKey(base, RECURRING_HORIZON_DAYS);
}

export async function createAdminBooking(input: {
  barberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerPhone: string;
  staffId?: string | null;
}) {
  const team = await isTeamMode(input.barberId);
  if (team && !input.staffId) {
    throw new Error("נא לבחור ספר מהצוות");
  }

  return bookAppointment({
    barberId: input.barberId,
    dateKey: input.dateKey,
    time: input.time,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    staffKey: input.staffId || undefined,
    source: "ADMIN",
  });
}

async function materializeSeriesOccurrences(input: {
  seriesId: string;
  barberId: string;
  staffId?: string | null;
  customerName: string;
  customerPhone: string;
  interval: RecurringInterval;
  time: string;
  startDateKey: string;
  /** If set (legacy), never create past this date */
  endDateKey?: string | null;
}) {
  const horizon = horizonUntilDateKey(input.startDateKey);
  const until =
    input.endDateKey && input.endDateKey < horizon
      ? input.endDateKey
      : horizon;

  const today = toDateKey();
  const fromDateKey =
    input.startDateKey > today ? input.startDateKey : today;

  const dateKeys = listOccurrenceDateKeys({
    startDateKey: input.startDateKey,
    untilDateKey: until,
    interval: input.interval,
    fromDateKey,
  });

  const existing = await prisma.appointment.findMany({
    where: {
      seriesId: input.seriesId,
      status: "BOOKED",
    },
    select: { startsAt: true },
  });
  const existingKeys = new Set(
    existing.map((a) => toDateKey(a.startsAt)),
  );

  const created: string[] = [];
  const skipped: { dateKey: string; reason: string }[] = [];

  for (const dateKey of dateKeys) {
    if (existingKeys.has(dateKey)) continue;
    try {
      const appt = await bookAppointment({
        barberId: input.barberId,
        dateKey,
        time: input.time,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        staffKey: input.staffId || undefined,
        source: "RECURRING",
        seriesId: input.seriesId,
      });
      created.push(appt.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "דילוג";
      skipped.push({ dateKey, reason });
    }
  }

  return { created, skipped };
}

export async function createRecurringSeries(input: {
  barberId: string;
  staffId?: string | null;
  customerName: string;
  customerPhone: string;
  interval: RecurringInterval;
  time: string;
  startDateKey: string;
}) {
  const team = await isTeamMode(input.barberId);
  if (team && !input.staffId) {
    throw new Error("נא לבחור ספר מהצוות");
  }

  const series = await prisma.recurringSeries.create({
    data: {
      barberId: input.barberId,
      staffId: input.staffId || null,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      interval: input.interval,
      time: input.time,
      startDateKey: input.startDateKey,
      endDateKey: null,
      isActive: true,
    },
  });

  const { created, skipped } = await materializeSeriesOccurrences({
    seriesId: series.id,
    barberId: input.barberId,
    staffId: input.staffId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    interval: input.interval,
    time: input.time,
    startDateKey: input.startDateKey,
    endDateKey: null,
  });

  if (created.length === 0) {
    await prisma.recurringSeries.delete({ where: { id: series.id } });
    throw new Error("לא ניתן לקבוע אף מועד — כל השעות תפוסות או לא פנויות");
  }

  return {
    series,
    createdCount: created.length,
    skipped,
  };
}

/**
 * Keep open-ended (and still-active capped) series filled ~12 weeks ahead.
 * Safe to run from the existing reminders cron.
 */
export async function extendActiveRecurringSeries() {
  const seriesList = await prisma.recurringSeries.findMany({
    where: { isActive: true },
  });

  let seriesProcessed = 0;
  let createdTotal = 0;
  let skippedTotal = 0;

  for (const series of seriesList) {
    seriesProcessed += 1;
    const { created, skipped } = await materializeSeriesOccurrences({
      seriesId: series.id,
      barberId: series.barberId,
      staffId: series.staffId,
      customerName: series.customerName,
      customerPhone: series.customerPhone,
      interval: series.interval as RecurringInterval,
      time: series.time,
      startDateKey: series.startDateKey,
      endDateKey: series.endDateKey,
    });
    createdTotal += created.length;
    skippedTotal += skipped.length;
  }

  return { seriesProcessed, createdTotal, skippedTotal };
}
