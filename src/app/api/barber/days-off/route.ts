import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDbDate, toDateKey } from "@/lib/time";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const from = dateKeyToDbDate(toDateKey());

  const dayOffs = await prisma.dayOff.findMany({
    where: { barberId: session.barberId, date: { gte: from } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ dayOffs });
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, "errDateInvalid") },
      { status: 400 },
    );
  }

  const date = dateKeyToDbDate(parsed.data.date);
  const dayOff = await prisma.dayOff.upsert({
    where: {
      barberId_date: { barberId: session.barberId, date },
    },
    update: { note: parsed.data.note || null },
    create: {
      barberId: session.barberId,
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
    return NextResponse.json(
      { error: t(locale, "errIdMissing") },
      { status: 400 },
    );
  }

  await prisma.dayOff.deleteMany({
    where: { id: parsed.data.id, barberId: session.barberId },
  });

  return NextResponse.json({ ok: true });
}
