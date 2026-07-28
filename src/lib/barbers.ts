import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const RESERVED_SLUGS = new Set([
  "platform",
  "api",
  "admin",
  "login",
  "_next",
  "favicon.ico",
]);

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export async function authenticateBarber(username: string, password: string) {
  const barber = await prisma.barber.findUnique({ where: { username } });
  if (!barber || !barber.isActive) return null;
  const ok = await compare(password, barber.passwordHash);
  if (!ok) return null;
  return barber;
}

export async function createBarber(input: {
  slug: string;
  displayName: string;
  username: string;
  password: string;
  slotMinutes?: number;
}) {
  if (!isValidSlug(input.slug)) {
    throw new Error("כתובת לא תקינה (רק אותיות באנגלית קטנות, מספרים ומקף)");
  }

  const passwordHash = await hash(input.password, 12);

  return prisma.barber.create({
    data: {
      slug: input.slug,
      displayName: input.displayName.trim(),
      username: input.username.trim(),
      passwordHash,
      slotMinutes: input.slotMinutes ?? 30,
      workingHours: {
        create: [
          { dayOfWeek: 0, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
        ],
      },
    },
  });
}

export async function resetBarberPassword(barberId: string, password: string) {
  const passwordHash = await hash(password, 12);
  return prisma.barber.update({
    where: { id: barberId },
    data: { passwordHash },
  });
}
