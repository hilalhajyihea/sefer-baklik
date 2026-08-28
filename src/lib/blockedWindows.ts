import { prisma } from "@/lib/prisma";
import { combineDateAndTime, dateKeyToDbDate } from "@/lib/time";

export type BlockedWindowRange = {
  startTime: string;
  endTime: string;
};

export async function getBlockedWindowsForDate(
  barberId: string,
  dateKey: string,
): Promise<BlockedWindowRange[]> {
  const rows = await prisma.blockedWindow.findMany({
    where: {
      barberId,
      date: dateKeyToDbDate(dateKey),
    },
    select: { startTime: true, endTime: true },
  });
  return rows;
}

export function slotOverlapsBlockedWindow(
  dateKey: string,
  time: string,
  slotMinutes: number,
  windows: BlockedWindowRange[],
): boolean {
  if (windows.length === 0) return false;

  const startsAt = combineDateAndTime(dateKey, time);
  const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);

  for (const window of windows) {
    const blockStart = combineDateAndTime(dateKey, window.startTime);
    const blockEnd = combineDateAndTime(dateKey, window.endTime);
    if (startsAt < blockEnd && endsAt > blockStart) {
      return true;
    }
  }

  return false;
}

export function filterSlotsByBlockedWindows(
  slots: string[],
  dateKey: string,
  slotMinutes: number,
  windows: BlockedWindowRange[],
): string[] {
  if (windows.length === 0) return slots;
  return slots.filter(
    (time) => !slotOverlapsBlockedWindow(dateKey, time, slotMinutes, windows),
  );
}
