import { prisma } from "@/lib/prisma";

export type StaffSummary = {
  id: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
};

const DEFAULT_HOURS = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
] as const;

export async function countActiveStaff(barberId: string) {
  return prisma.staff.count({
    where: { barberId, isActive: true },
  });
}

export async function isTeamMode(barberId: string) {
  return (await countActiveStaff(barberId)) >= 2;
}

export async function getActiveStaff(barberId: string): Promise<StaffSummary[]> {
  return prisma.staff.findMany({
    where: { barberId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      displayName: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

export async function getAllStaff(barberId: string) {
  return prisma.staff.findMany({
    where: { barberId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** Copy shop hours when available; otherwise default Sun–Thu 09–18. */
export async function resolveSeedHours(barberId: string) {
  const shopHours = await prisma.workingHours.findMany({
    where: { barberId },
    orderBy: { dayOfWeek: "asc" },
  });
  if (shopHours.length > 0) {
    return shopHours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      startTime: h.startTime,
      endTime: h.endTime,
    }));
  }
  return DEFAULT_HOURS.map((h) => ({ ...h }));
}

export async function createStaffMember(input: {
  barberId: string;
  displayName: string;
  sortOrder?: number;
}) {
  const name = input.displayName.trim();
  if (name.length < 2) {
    throw new Error("שם ספר חייב להיות לפחות 2 תווים");
  }

  const hours = await resolveSeedHours(input.barberId);
  const maxOrder = await prisma.staff.aggregate({
    where: { barberId: input.barberId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  return prisma.staff.create({
    data: {
      barberId: input.barberId,
      displayName: name,
      sortOrder,
      workingHours: {
        create: hours,
      },
    },
  });
}
