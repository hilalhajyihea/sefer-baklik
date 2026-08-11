import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { isTeamMode } from "@/lib/staff";
import { dateKeyToDbDate, toDateKey } from "@/lib/time";

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

  const from = dateKeyToDbDate(toDateKey());
  const dayOffs = await prisma.staffDayOff.findMany({
    where: { staffId, date: { gte: from } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ dayOffs });
}

const createSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  if (!(await isTeamMode(session.barberId))) {
    return NextResponse.json({ error: t(locale, "errInvalidData") }, { status: 400 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, "errDateInvalid") }, { status: 400 });
  }

  const staff = await assertStaffOwned(session.barberId, parsed.data.staffId);
  if (!staff) {
    return NextResponse.json({ error: t(locale, "errStaffNotFound") }, { status: 404 });
  }

  const date = dateKeyToDbDate(parsed.data.date);
  const dayOff = await prisma.staffDayOff.upsert({
    where: {
      staffId_date: { staffId: parsed.data.staffId, date },
    },
    update: { note: parsed.data.note || null },
    create: {
      staffId: parsed.data.staffId,
      date,
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ dayOff });
}

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, "errIdMissing") }, { status: 400 });
  }

  await prisma.staffDayOff.deleteMany({
    where: {
      id: parsed.data.id,
      staff: { barberId: session.barberId },
    },
  });

  return NextResponse.json({ ok: true });
}
