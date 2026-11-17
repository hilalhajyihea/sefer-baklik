import { prisma } from "@/lib/prisma";
import { SLOT_HOLD_STATUSES } from "@/lib/appointmentStatus";
import { notifyCustomerOfCancellation } from "@/lib/cancel";
import {
  endOfJerusalemDay,
  startOfJerusalemDay,
} from "@/lib/time";

/** Stored on Appointment.cancelReason when cancelled because of a day off. */
export const CANCEL_REASON_DAY_OFF = "DAY_OFF";

/**
 * Cancel BOOKED / PENDING_CONFIRM appointments on dateKey only.
 * Does NOT deactivate recurring series. Notifies each booking lead once.
 */
export async function cancelAppointmentsForDayOff(input: {
  barberId: string;
  dateKey: string;
  /** Team mode: only this staff member's appointments */
  staffId?: string | null;
}) {
  const dayStart = startOfJerusalemDay(input.dateKey);
  const dayEnd = endOfJerusalemDay(input.dateKey);

  const toCancel = await prisma.appointment.findMany({
    where: {
      barberId: input.barberId,
      status: { in: [...SLOT_HOLD_STATUSES] },
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(input.staffId ? { staffId: input.staffId } : {}),
    },
    include: {
      barber: {
        select: {
          displayName: true,
          locale: true,
          smsPlanEnabled: true,
          whatsappPlanEnabled: true,
        },
      },
      staff: { select: { displayName: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  if (toCancel.length === 0) {
    return { cancelledCount: 0, notifiedCount: 0 };
  }

  const ids = toCancel.map((a) => a.id);
  await prisma.appointment.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "CANCELLED",
      cancelReason: CANCEL_REASON_DAY_OFF,
      confirmExpiresAt: null,
      confirmCode: null,
    },
  });

  // One SMS/WA per booking lead (skip party followers)
  let notifiedCount = 0;
  const notifiedKeys = new Set<string>();
  for (const a of toCancel) {
    const key = a.bookingGroupId || a.id;
    if (notifiedKeys.has(key)) continue;
    if (a.bookingGroupIndex != null && a.bookingGroupIndex > 0) continue;
    notifiedKeys.add(key);
    void notifyCustomerOfCancellation({
      id: a.id,
      barberId: a.barberId,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      startsAt: a.startsAt,
      bookingGroupIndex: a.bookingGroupIndex,
      barber: a.barber,
      staff: a.staff,
    });
    notifiedCount += 1;
  }

  return { cancelledCount: toCancel.length, notifiedCount };
}

/**
 * After removing a day off: restore appointments cancelled with DAY_OFF
 * on that date, only when the slot is still free. Series stays as-is.
 */
export async function restoreAppointmentsAfterDayOffRemoved(input: {
  barberId: string;
  dateKey: string;
  staffId?: string | null;
}) {
  const dayStart = startOfJerusalemDay(input.dateKey);
  const dayEnd = endOfJerusalemDay(input.dateKey);

  const candidates = await prisma.appointment.findMany({
    where: {
      barberId: input.barberId,
      status: "CANCELLED",
      cancelReason: CANCEL_REASON_DAY_OFF,
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(input.staffId ? { staffId: input.staffId } : {}),
    },
    orderBy: { startsAt: "asc" },
  });

  let restoredCount = 0;
  let skippedCount = 0;

  for (const a of candidates) {
    const overlap = await prisma.appointment.findFirst({
      where: {
        id: { not: a.id },
        status: { in: [...SLOT_HOLD_STATUSES] },
        startsAt: { lt: a.endsAt },
        endsAt: { gt: a.startsAt },
        ...(a.staffId
          ? { staffId: a.staffId }
          : { barberId: input.barberId }),
      },
    });
    if (overlap) {
      skippedCount += 1;
      continue;
    }

    await prisma.appointment.update({
      where: { id: a.id },
      data: {
        status: "BOOKED",
        cancelReason: null,
        // Allow a fresh reminder if the appointment is still upcoming
        reminderSentAt: null,
      },
    });
    restoredCount += 1;
  }

  return { restoredCount, skippedCount, candidateCount: candidates.length };
}

/** Preview how many active appointments would be affected by a day off. */
export async function countAppointmentsOnDay(input: {
  barberId: string;
  dateKey: string;
  staffId?: string | null;
}) {
  const dayStart = startOfJerusalemDay(input.dateKey);
  const dayEnd = endOfJerusalemDay(input.dateKey);
  return prisma.appointment.count({
    where: {
      barberId: input.barberId,
      status: { in: [...SLOT_HOLD_STATUSES] },
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(input.staffId ? { staffId: input.staffId } : {}),
    },
  });
}
