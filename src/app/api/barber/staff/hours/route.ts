import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { isTeamMode } from "@/lib/staff";

const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

const putSchema = z.object({
  staffId: z.string().min(1),
  hours: z.array(hourSchema).length(7),
});

async function assertStaffOwned(barberId: string, staffId: string) {
  return prisma.staff.findFirst({
    where: { id: staffId, barberId },
  });
}

export async function GET(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const staffId = new URL(request.url).searchParams.get("staffId");
  if (!staffId) {
    return NextResponse.json({ error: t(locale, "errIdMissing") }, { status: 400 });
  }

  const staff = await assertStaffOwned(session.barberId, staffId);
  if (!staff) {
    return NextResponse.json({ error: t(locale, "errStaffNotFound") }, { status: 404 });
  }

  const hours = await prisma.staffWorkingHours.findMany({
    where: { staffId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ hours });
}

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  if (!(await isTeamMode(session.barberId))) {
    return NextResponse.json({ error: t(locale, "errInvalidData") }, { status: 400 });
  }

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, "errInvalidData") }, { status: 400 });
  }

  const staff = await assertStaffOwned(session.barberId, parsed.data.staffId);
  if (!staff) {
    return NextResponse.json({ error: t(locale, "errStaffNotFound") }, { status: 404 });
  }

  for (const h of parsed.data.hours) {
    if (h.enabled && h.startTime >= h.endTime) {
      return NextResponse.json(
        { error: t(locale, "errHoursOrder") },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffWorkingHours.deleteMany({
      where: { staffId: parsed.data.staffId },
    });
    const enabled = parsed.data.hours.filter((h) => h.enabled);
    if (enabled.length > 0) {
      await tx.staffWorkingHours.createMany({
        data: enabled.map((h) => ({
          staffId: parsed.data.staffId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
