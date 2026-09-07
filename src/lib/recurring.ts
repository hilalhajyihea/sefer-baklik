import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/availability";
import { combineDateAndTime, toDateKey } from "@/lib/time";
import { isTeamMode } from "@/lib/staff";

export type RecurringInterval =
  | "WEEKLY"
  | "BIWEEKLY"
  | "TRIWEEKLY"
  | "MONTHLY";

const MAX_OCCURRENCES = 52;

export function addIntervalToDateKey(
  dateKey: string,
  interval: RecurringInterval,
): string {
  const noon = combineDateAndTime(dateKey, "12:00");
  if (interval === "MONTHLY") {
    const [y, m, d] = dateKey.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    // Clamp day for shorter months
    const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const days =
    interval === "WEEKLY" ? 7 : interval === "BIWEEKLY" ? 14 : 21;
  return toDateKey(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000));
}

export function listOccurrenceDateKeys(input: {
  startDateKey: string;
  endDateKey: string;
  interval: RecurringInterval;
}): string[] {
  const keys: string[] = [];
  let cursor = input.startDateKey;
  while (cursor <= input.endDateKey && keys.length < MAX_OCCURRENCES) {
    keys.push(cursor);
    cursor = addIntervalToDateKey(cursor, input.interval);
  }
  return keys;
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

export async function createRecurringSeries(input: {
  barberId: string;
  staffId?: string | null;
  customerName: string;
  customerPhone: string;
  interval: RecurringInterval;
  time: string;
  startDateKey: string;
  endDateKey: string;
}) {
  if (input.endDateKey < input.startDateKey) {
    throw new Error("תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
  }

  const team = await isTeamMode(input.barberId);
  if (team && !input.staffId) {
    throw new Error("נא לבחור ספר מהצוות");
  }

  const dateKeys = listOccurrenceDateKeys({
    startDateKey: input.startDateKey,
    endDateKey: input.endDateKey,
    interval: input.interval,
  });
  if (dateKeys.length === 0) {
    throw new Error("לא נוצרו מועדים בסדרה");
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
      endDateKey: input.endDateKey,
    },
  });

  const created: string[] = [];
  const skipped: { dateKey: string; reason: string }[] = [];

  for (const dateKey of dateKeys) {
    try {
      const appt = await bookAppointment({
        barberId: input.barberId,
        dateKey,
        time: input.time,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        staffKey: input.staffId || undefined,
        source: "RECURRING",
        seriesId: series.id,
      });
      created.push(appt.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "דילוג";
      skipped.push({ dateKey, reason });
    }
  }

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
