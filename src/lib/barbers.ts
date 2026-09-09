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

/** Passwords are stored and checked case-insensitively (like usernames). */
function normalizePassword(password: string) {
  return password.trim().toLowerCase();
}

export async function authenticateBarber(username: string, password: string) {
  const normalizedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();
  const normalizedPass = trimmedPass.toLowerCase();
  if (!normalizedUser || !normalizedPass) return null;

  // Case-insensitive match so iPhone auto-capitalization doesn't block login
  const barber = await prisma.barber.findFirst({
    where: {
      username: { equals: normalizedUser, mode: "insensitive" },
    },
  });
  if (!barber || !barber.isActive) return null;

  let ok = await compare(normalizedPass, barber.passwordHash);
  // Legacy hashes may still be mixed-case — accept exact trim once, then migrate
  if (!ok && trimmedPass !== normalizedPass) {
    ok = await compare(trimmedPass, barber.passwordHash);
    if (ok) {
      await prisma.barber.update({
        where: { id: barber.id },
        data: { passwordHash: await hash(normalizedPass, 12) },
      });
    }
  }
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

  const passwordHash = await hash(normalizePassword(input.password), 12);

  return prisma.barber.create({
    data: {
      slug: input.slug,
      displayName: input.displayName.trim(),
      username: input.username.trim().toLowerCase(),
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
  const passwordHash = await hash(normalizePassword(password), 12);
  return prisma.barber.update({
    where: { id: barberId },
    data: { passwordHash },
  });
}
