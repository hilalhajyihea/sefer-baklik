import { prisma } from "@/lib/prisma";
import { SLOT_HOLD_STATUSES } from "@/lib/appointmentStatus";
import {
  filterSlotsByBlockedWindows,
  getBlockedWindowsForDate,
} from "@/lib/blockedWindows";
import { generateCancelToken } from "@/lib/cancel";
import {
  clampPartySize,
  consecutiveTimesFrom,
  filterSlotsForPartySize,
  generateBookingGroupId,
} from "@/lib/partyBooking";
import { resolveSlotMinutes } from "@/lib/slotMinutes";
import { getActiveStaff, isTeamMode } from "@/lib/staff";
import {
  combineDateAndTime,
  dateKeyToDbDate,
  endOfJerusalemDay,
  getJerusalemDayOfWeek,
  minutesToTime,
  parseTimeToMinutes,
  startOfJerusalemDay,
  toDateKey,
} from "@/lib/time";

function buildSlotsFromWindow(input: {
  dateKey: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  appointments: { startsAt: Date; endsAt: Date }[];
}) {
  const startMin = parseTimeToMinutes(input.startTime);
  const endMin = parseTimeToMinutes(input.endTime);
  const now = new Date();
  const slots: string[] = [];

  // Only offer starts that fully fit inside working hours (no spillover).
  for (let t = startMin; t + input.slotMinutes <= endMin; t += input.slotMinutes) {
    const time = minutesToTime(t);
    const startsAt = combineDateAndTime(input.dateKey, time);
    const endsAt = new Date(startsAt.getTime() + input.slotMinutes * 60_000);

    if (startsAt <= now) continue;

    const conflict = input.appointments.some(
      (a) => startsAt < a.endsAt && endsAt > a.startsAt,
    );
    if (!conflict) slots.push(time);
  }

  return slots;
}

/** Solo shop slots (existing behavior). */
export async function getAvailableSlots(
  barberId: string,
  dateKey: string,
  slotMinutesOverride?: number | null,
) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { workingHours: true },
  });
  if (!barber || !barber.isActive) return [];

  const slotMinutes = resolveSlotMinutes(
    slotMinutesOverride,
    barber.slotMinutes,
  );

  const dayOfWeek = getJerusalemDayOfWeek(combineDateAndTime(dateKey, "12:00"));
  const hours = barber.workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!hours) return [];

  const dayOff = await prisma.dayOff.findUnique({
    where: {
      barberId_date: { barberId, date: dateKeyToDbDate(dateKey) },
    },
  });
  if (dayOff) return [];

  const dayStart = startOfJerusalemDay(dateKey);
  const dayEnd = endOfJerusalemDay(dateKey);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: [...SLOT_HOLD_STATUSES] },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  const blockedWindows = await getBlockedWindowsForDate(barberId, dateKey);

  const slots = buildSlotsFromWindow({
    dateKey,
    startTime: hours.startTime,
    endTime: hours.endTime,
    slotMinutes,
    appointments,
  });

  return filterSlotsByBlockedWindows(
    slots,
    dateKey,
    slotMinutes,
    blockedWindows,
  );
}

export async function getStaffSlots(
  staffId: string,
  dateKey: string,
  slotMinutesOverride?: number | null,
) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      workingHours: true,
      barber: { select: { id: true, isActive: true, slotMinutes: true } },
    },
  });
  if (!staff || !staff.isActive || !staff.barber.isActive) return [];

  const slotMinutes = resolveSlotMinutes(
    slotMinutesOverride,
    staff.barber.slotMinutes,
  );

  const dayOfWeek = getJerusalemDayOfWeek(combineDateAndTime(dateKey, "12:00"));
  const hours = staff.workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!hours) return [];

  const dayOff = await prisma.staffDayOff.findUnique({
    where: {
      staffId_date: { staffId, date: dateKeyToDbDate(dateKey) },
    },
  });
  if (dayOff) return [];

  const dayStart = startOfJerusalemDay(dateKey);
  const dayEnd = endOfJerusalemDay(dateKey);

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: { in: [...SLOT_HOLD_STATUSES] },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  const blockedWindows = await getBlockedWindowsForDate(
    staff.barber.id,
    dateKey,
  );

  const slots = buildSlotsFromWindow({
    dateKey,
    startTime: hours.startTime,
    endTime: hours.endTime,
    slotMinutes,
    appointments,
  });

  return filterSlotsByBlockedWindows(
    slots,
    dateKey,
    slotMinutes,
    blockedWindows,
  );
}

/**
 * `staffKey` = specific staff id, or "any" for union of free times.
 * Solo shops ignore staffKey.
 * `partySize` > 1 only returns starts that have that many consecutive free slots
 * (for "any", on the same staff member).
 */
export async function getTeamOrSoloSlots(
  barberId: string,
  dateKey: string,
  staffKey?: string | null,
  slotMinutesOverride?: number | null,
  partySize: number = 1,
) {
  const count = clampPartySize(partySize);
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { slotMinutes: true },
  });
  const slotMinutes = resolveSlotMinutes(
    slotMinutesOverride,
    barber?.slotMinutes,
  );

  if (!(await isTeamMode(barberId))) {
    const slots = await getAvailableSlots(barberId, dateKey, slotMinutes);
    return filterSlotsForPartySize(slots, count, slotMinutes);
  }

  const staff = await getActiveStaff(barberId);
  if (staff.length < 2) {
    const slots = await getAvailableSlots(barberId, dateKey, slotMinutes);
    return filterSlotsForPartySize(slots, count, slotMinutes);
  }

  if (staffKey && staffKey !== "any") {
    const match = staff.find((s) => s.id === staffKey);
    if (!match) return [];
    const slots = await getStaffSlots(match.id, dateKey, slotMinutes);
    return filterSlotsForPartySize(slots, count, slotMinutes);
  }

  if (count <= 1) {
    const sets = await Promise.all(
      staff.map((s) => getStaffSlots(s.id, dateKey, slotMinutes)),
    );
    const union = new Set<string>();
    for (const list of sets) {
      for (const t of list) union.add(t);
    }
    return Array.from(union).sort();
  }

  // Party on "any": start time must be free for N consecutive slots on ONE staff
  const union = new Set<string>();
  for (const s of staff) {
    const slots = await getStaffSlots(s.id, dateKey, slotMinutes);
    for (const t of filterSlotsForPartySize(slots, count, slotMinutes)) {
      union.add(t);
    }
  }
  return Array.from(union).sort();
}

async function pickStaffForAnySlot(
  barberId: string,
  dateKey: string,
  time: string,
  slotMinutesOverride?: number | null,
) {
  const staff = await getActiveStaff(barberId);
  const dayStart = startOfJerusalemDay(dateKey);
  const dayEnd = endOfJerusalemDay(dateKey);

  const candidates: { id: string; sortOrder: number; dayCount: number }[] = [];

  for (const s of staff) {
    const slots = await getStaffSlots(s.id, dateKey, slotMinutesOverride);
    if (!slots.includes(time)) continue;

    const dayCount = await prisma.appointment.count({
      where: {
        staffId: s.id,
        status: { in: [...SLOT_HOLD_STATUSES] },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
    });
    candidates.push({ id: s.id, sortOrder: s.sortOrder, dayCount });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.dayCount !== b.dayCount) return a.dayCount - b.dayCount;
    return a.sortOrder - b.sortOrder;
  });
  return candidates[0]!.id;
}

async function pickStaffForConsecutive(
  barberId: string,
  dateKey: string,
  times: string[],
  slotMinutes: number,
) {
  const staff = await getActiveStaff(barberId);
  const dayStart = startOfJerusalemDay(dateKey);
  const dayEnd = endOfJerusalemDay(dateKey);
  const candidates: { id: string; sortOrder: number; dayCount: number }[] = [];

  for (const s of staff) {
    const slots = await getStaffSlots(s.id, dateKey, slotMinutes);
    const set = new Set(slots);
    if (!times.every((t) => set.has(t))) continue;

    const dayCount = await prisma.appointment.count({
      where: {
        staffId: s.id,
        status: { in: [...SLOT_HOLD_STATUSES] },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
    });
    candidates.push({ id: s.id, sortOrder: s.sortOrder, dayCount });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.dayCount !== b.dayCount) return a.dayCount - b.dayCount;
    return a.sortOrder - b.sortOrder;
  });
  return candidates[0]!.id;
}

export async function bookAppointment(input: {
  barberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerPhone: string;
  /** Team mode: specific staff id, or "any" */
  staffKey?: string | null;
  source?: "PUBLIC" | "ADMIN" | "RECURRING";
  seriesId?: string | null;
  /** Admin override; public booking ignores and uses barber.slotMinutes */
  slotMinutes?: number | null;
  /** Default BOOKED; use PENDING_CONFIRM when barber requires link confirmation */
  status?: "BOOKED" | "PENDING_CONFIRM";
  confirmToken?: string | null;
  confirmExpiresAt?: Date | null;
}) {
  const barber = await prisma.barber.findUnique({
    where: { id: input.barberId },
  });
  if (!barber || !barber.isActive) {
    throw new Error("הספר לא פעיל");
  }

  const source = input.source ?? "PUBLIC";
  const status = input.status ?? "BOOKED";
  const slotMinutes =
    source === "PUBLIC"
      ? resolveSlotMinutes(barber.slotMinutes)
      : resolveSlotMinutes(input.slotMinutes, barber.slotMinutes);
  const team = await isTeamMode(input.barberId);

  if (!team) {
    const slots = await getAvailableSlots(
      input.barberId,
      input.dateKey,
      slotMinutes,
    );
    if (!slots.includes(input.time)) {
      throw new Error("השעה אינה פנויה");
    }

    const startsAt = combineDateAndTime(input.dateKey, input.time);
    const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);

    return prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.findFirst({
        where: {
          barberId: input.barberId,
          status: { in: [...SLOT_HOLD_STATUSES] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (overlapping) {
        throw new Error("השעה נתפסה בינתיים");
      }

      return tx.appointment.create({
        data: {
          barberId: input.barberId,
          seriesId: input.seriesId || null,
          startsAt,
          endsAt,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone.trim(),
          status,
          source,
          cancelToken: generateCancelToken(),
          confirmToken: input.confirmToken || null,
          confirmExpiresAt: input.confirmExpiresAt || null,
        },
      });
    });
  }

  let staffId =
    input.staffKey && input.staffKey !== "any" ? input.staffKey : null;

  if (!staffId) {
    staffId = await pickStaffForAnySlot(
      input.barberId,
      input.dateKey,
      input.time,
      slotMinutes,
    );
  }

  if (!staffId) {
    throw new Error("השעה אינה פנויה");
  }

  const staff = await prisma.staff.findFirst({
    where: {
      id: staffId,
      barberId: input.barberId,
      isActive: true,
    },
  });
  if (!staff) {
    throw new Error("השעה אינה פנויה");
  }

  const slots = await getStaffSlots(staff.id, input.dateKey, slotMinutes);
  if (!slots.includes(input.time)) {
    throw new Error("השעה אינה פנויה");
  }

  const startsAt = combineDateAndTime(input.dateKey, input.time);
  const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);

  return prisma.$transaction(async (tx) => {
    const overlapping = await tx.appointment.findFirst({
      where: {
        staffId: staff.id,
        status: { in: [...SLOT_HOLD_STATUSES] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlapping) {
      throw new Error("השעה נתפסה בינתיים");
    }

    return tx.appointment.create({
      data: {
        barberId: input.barberId,
        staffId: staff.id,
        seriesId: input.seriesId || null,
        startsAt,
        endsAt,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        status,
        source,
        cancelToken: generateCancelToken(),
        confirmToken: input.confirmToken || null,
        confirmExpiresAt: input.confirmExpiresAt || null,
      },
    });
  });
}

/**
 * Public multi-person booking. partySize 1 → identical to bookAppointment (no group).
 * partySize > 1 → consecutive slots, same staff, shared bookingGroupId; only index 0
 * gets cancel/confirm tokens and SMS/WA.
 */
export async function bookConsecutiveAppointments(input: {
  barberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerPhone: string;
  staffKey?: string | null;
  partySize?: number;
  status?: "BOOKED" | "PENDING_CONFIRM";
  confirmToken?: string | null;
  confirmExpiresAt?: Date | null;
}) {
  const partySize = clampPartySize(input.partySize ?? 1);
  if (partySize <= 1) {
    const lead = await bookAppointment({
      barberId: input.barberId,
      dateKey: input.dateKey,
      time: input.time,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      staffKey: input.staffKey,
      source: "PUBLIC",
      status: input.status,
      confirmToken: input.confirmToken,
      confirmExpiresAt: input.confirmExpiresAt,
    });
    return { lead, appointments: [lead], partySize: 1 };
  }

  const barber = await prisma.barber.findUnique({
    where: { id: input.barberId },
  });
  if (!barber || !barber.isActive) {
    throw new Error("הספר לא פעיל");
  }

  const status = input.status ?? "BOOKED";
  const slotMinutes = resolveSlotMinutes(barber.slotMinutes);
  const times = consecutiveTimesFrom(input.time, partySize, slotMinutes);
  const team = await isTeamMode(input.barberId);

  let staffId: string | null = null;
  if (team) {
    if (input.staffKey && input.staffKey !== "any") {
      staffId = input.staffKey;
      const slots = await getStaffSlots(staffId, input.dateKey, slotMinutes);
      const set = new Set(slots);
      if (!times.every((t) => set.has(t))) {
        throw new Error("השעה אינה פנויה");
      }
    } else {
      staffId = await pickStaffForConsecutive(
        input.barberId,
        input.dateKey,
        times,
        slotMinutes,
      );
      if (!staffId) {
        throw new Error("השעה אינה פנויה");
      }
    }
  } else {
    const slots = await getAvailableSlots(
      input.barberId,
      input.dateKey,
      slotMinutes,
    );
    const set = new Set(slots);
    if (!times.every((t) => set.has(t))) {
      throw new Error("השעה אינה פנויה");
    }
  }

  const groupId = generateBookingGroupId();
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();

  const appointments = await prisma.$transaction(async (tx) => {
    const created = [];
    for (let i = 0; i < times.length; i++) {
      const time = times[i]!;
      const startsAt = combineDateAndTime(input.dateKey, time);
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);

      const overlapping = await tx.appointment.findFirst({
        where: {
          ...(staffId
            ? { staffId }
            : { barberId: input.barberId }),
          status: { in: [...SLOT_HOLD_STATUSES] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (overlapping) {
        throw new Error("השעה נתפסה בינתיים");
      }

      const isLead = i === 0;
      const row = await tx.appointment.create({
        data: {
          barberId: input.barberId,
          staffId: staffId,
          startsAt,
          endsAt,
          customerName,
          customerPhone,
          status,
          source: "PUBLIC",
          bookingGroupId: groupId,
          bookingGroupIndex: i,
          cancelToken: isLead ? generateCancelToken() : null,
          confirmToken: isLead ? input.confirmToken || null : null,
          confirmExpiresAt: input.confirmExpiresAt || null,
        },
      });
      created.push(row);
    }
    return created;
  });

  return {
    lead: appointments[0]!,
    appointments,
    partySize,
  };
}

export function upcomingDateKeys(days = 14): string[] {
  const keys: string[] = [];
  const todayKey = toDateKey();
  for (let i = 0; i < days; i++) {
    const noon = combineDateAndTime(todayKey, "12:00");
    keys.push(toDateKey(new Date(noon.getTime() + i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}
