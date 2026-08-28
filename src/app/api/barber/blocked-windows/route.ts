import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDbDate, parseTimeToMinutes, toDateKey } from "@/lib/time";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const from = dateKeyToDbDate(toDateKey());

  const blockedWindows = await prisma.blockedWindow.findMany({
    where: { barberId: session.barberId, date: { gte: from } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ blockedWindows });
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
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
      { error: t(locale, "errInvalidData") },
      { status: 400 },
    );
  }

  const startMin = parseTimeToMinutes(parsed.data.startTime);
  const endMin = parseTimeToMinutes(parsed.data.endTime);
  if (startMin >= endMin) {
    return NextResponse.json(
      { error: t(locale, "errHoursOrder") },
      { status: 400 },
    );
  }

  const blockedWindow = await prisma.blockedWindow.create({
    data: {
      barberId: session.barberId,
      date: dateKeyToDbDate(parsed.data.date),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      note: parsed.data.note?.trim() || null,
    },
  });

  return NextResponse.json({ blockedWindow });
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

  await prisma.blockedWindow.deleteMany({
    where: { id: parsed.data.id, barberId: session.barberId },
  });

  return NextResponse.json({ ok: true });
}
