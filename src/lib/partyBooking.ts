import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";
import { minutesToTime, parseTimeToMinutes } from "@/lib/time";

/** Max people in one consecutive public booking. */
export const MAX_PARTY_SIZE = 6;

export function clampPartySize(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_PARTY_SIZE, Math.floor(n)));
}

export function generateBookingGroupId() {
  return randomBytes(8).toString("base64url");
}

/** Start times that have `count` consecutive free slots in `slots`. */
export function filterSlotsForPartySize(
  slots: string[],
  count: number,
  slotMinutes: number,
): string[] {
  if (count <= 1) return slots;
  const set = new Set(slots);
  return slots.filter((time) => {
    const start = parseTimeToMinutes(time);
    for (let i = 0; i < count; i++) {
      if (!set.has(minutesToTime(start + i * slotMinutes))) return false;
    }
    return true;
  });
}

export function consecutiveTimesFrom(
  startTime: string,
  count: number,
  slotMinutes: number,
): string[] {
  const start = parseTimeToMinutes(startTime);
  return Array.from({ length: count }, (_, i) =>
    minutesToTime(start + i * slotMinutes),
  );
}

/** Size of a multi-person booking group; 1 when not in a group. */
export async function countBookingGroupSize(
  bookingGroupId: string | null | undefined,
): Promise<number> {
  if (!bookingGroupId) return 1;
  const n = await prisma.appointment.count({
    where: {
      bookingGroupId,
      status: { in: ["BOOKED", "PENDING_CONFIRM"] },
    },
  });
  return Math.max(1, n);
}

/**
 * Enrich time label for existing WhatsApp templates (no new {{n}}).
 * e.g. "10:00 (3 مواعيد)" when partySize > 1.
 */
export function timeLabelWithPartySize(
  timeLabel: string,
  partySize: number,
  locale?: Locale | string | null,
): string {
  if (partySize <= 1) return timeLabel;
  return (
    timeLabel +
    t(normalizeLocale(locale), "waPartyTimeSuffix", { count: partySize })
  );
}
