import { prisma } from "@/lib/prisma";
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

export async function getAvailableSlots(barberId: string, dateKey: string) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { workingHours: true },
  });
  if (!barber || !barber.isActive) return [];

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
      status: "BOOKED",
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  const slotMinutes = barber.slotMinutes;
  const startMin = parseTimeToMinutes(hours.startTime);
  const endMin = parseTimeToMinutes(hours.endTime);
  const now = new Date();
  const slots: string[] = [];

  for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
    const time = minutesToTime(t);
    const startsAt = combineDateAndTime(dateKey, time);
    const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);

    if (startsAt <= now) continue;

    const conflict = appointments.some(
      (a) => startsAt < a.endsAt && endsAt > a.startsAt,
    );
    if (!conflict) slots.push(time);
  }

  return slots;
}

export async function bookAppointment(input: {
  barberId: string;
  dateKey: string;
  time: string;
  customerName: string;
  customerPhone: string;
}) {
  const barber = await prisma.barber.findUnique({
    where: { id: input.barberId },
  });
  if (!barber || !barber.isActive) {
    throw new Error("הספר לא פעיל");
  }

  const slots = await getAvailableSlots(input.barberId, input.dateKey);
  if (!slots.includes(input.time)) {
    throw new Error("השעה אינה פנויה");
  }

  const startsAt = combineDateAndTime(input.dateKey, input.time);
  const endsAt = new Date(startsAt.getTime() + barber.slotMinutes * 60_000);

  return prisma.$transaction(async (tx) => {
    const overlapping = await tx.appointment.findFirst({
      where: {
        barberId: input.barberId,
        status: "BOOKED",
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
        startsAt,
        endsAt,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        status: "BOOKED",
      },
    });
  });
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
