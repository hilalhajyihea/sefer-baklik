import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDbDate, dbDateToDateKey } from "@/lib/time";
import { VACATION_NOTICE_MAX_LEN } from "@/lib/vacationNotice";

function serializeNotice(barber: {
  vacationNoticeText: string | null;
  vacationNoticeShowFrom: Date | null;
  vacationNoticeUntil: Date | null;
}) {
  return {
    text: barber.vacationNoticeText || "",
    showFrom: barber.vacationNoticeShowFrom
      ? dbDateToDateKey(barber.vacationNoticeShowFrom)
      : "",
    until: barber.vacationNoticeUntil
      ? dbDateToDateKey(barber.vacationNoticeUntil)
      : "",
  };
}

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: {
      vacationNoticeText: true,
      vacationNoticeShowFrom: true,
      vacationNoticeUntil: true,
    },
  });
  if (!barber) {
    return NextResponse.json(
      { error: t(locale, "errBarberNotFound") },
      { status: 404 },
    );
  }

  return NextResponse.json({ notice: serializeNotice(barber) });
}

const putSchema = z.object({
  text: z.string().max(VACATION_NOTICE_MAX_LEN),
  showFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional(),
  clear: z.boolean().optional(),
});

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, "errInvalidData") },
      { status: 400 },
    );
  }

  if (parsed.data.clear) {
    const barber = await prisma.barber.update({
      where: { id: session.barberId },
      data: {
        vacationNoticeText: null,
        vacationNoticeShowFrom: null,
        vacationNoticeUntil: null,
      },
      select: {
        vacationNoticeText: true,
        vacationNoticeShowFrom: true,
        vacationNoticeUntil: true,
      },
    });
    return NextResponse.json({ notice: serializeNotice(barber) });
  }

  const text = parsed.data.text.trim();
  const showFrom = (parsed.data.showFrom || "").trim();
  const until = (parsed.data.until || "").trim();

  if (!text) {
    return NextResponse.json(
      { error: t(locale, "vacationNoticeTextRequired") },
      { status: 400 },
    );
  }
  if (!showFrom || !until) {
    return NextResponse.json(
      { error: t(locale, "vacationNoticeDatesRequired") },
      { status: 400 },
    );
  }
  if (showFrom > until) {
    return NextResponse.json(
      { error: t(locale, "vacationNoticeDatesOrder") },
      { status: 400 },
    );
  }

  const barber = await prisma.barber.update({
    where: { id: session.barberId },
    data: {
      vacationNoticeText: text,
      vacationNoticeShowFrom: dateKeyToDbDate(showFrom),
      vacationNoticeUntil: dateKeyToDbDate(until),
    },
    select: {
      vacationNoticeText: true,
      vacationNoticeShowFrom: true,
      vacationNoticeUntil: true,
    },
  });

  return NextResponse.json({ notice: serializeNotice(barber) });
}
