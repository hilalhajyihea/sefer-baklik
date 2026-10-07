import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamOrSoloSlots } from "@/lib/availability";
import { normalizeLocale, t } from "@/lib/i18n";
import {
  isActiveWorkingDay,
  joinWaitlist,
  MAX_WAITLIST_PER_DAY,
  countWaitlistForDay,
} from "@/lib/waitlist";

export async function POST(request: Request) {
  let locale: ReturnType<typeof normalizeLocale> = "he";
  try {
    const body = await request.json();
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const barberPreview = slug
      ? await prisma.barber.findUnique({
          where: { slug },
          select: { locale: true },
        })
      : null;
    locale = normalizeLocale(barberPreview?.locale);

    const schema = z.object({
      slug: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      customerName: z.string().min(2, t(locale, "errNameRequired")).max(80),
      customerPhone: z
        .string()
        .min(9, t(locale, "errPhoneRequired"))
        .max(20)
        .regex(/^[\d+\-\s()]+$/, t(locale, "errPhoneInvalid")),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || t(locale, "errInvalidData"),
        },
        { status: 400 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.slug },
    });
    locale = normalizeLocale(barber?.locale);
    if (!barber || !barber.isActive) {
      return NextResponse.json(
        { error: t(locale, "errBarberNotFound") },
        { status: 404 },
      );
    }

    const slots = await getTeamOrSoloSlots(
      barber.id,
      parsed.data.date,
      "any",
      barber.slotMinutes,
      1,
    );
    if (slots.length > 0) {
      return NextResponse.json(
        { error: t(locale, "waitlistDayClosed") },
        { status: 409 },
      );
    }

    const entry = await joinWaitlist({
      barberId: barber.id,
      dateKey: parsed.data.date,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
    });

    const count = await countWaitlistForDay(barber.id, parsed.data.date);

    return NextResponse.json({
      ok: true,
      entry: {
        id: entry.id,
        date: parsed.data.date,
        customerName: entry.customerName,
      },
      count,
      max: MAX_WAITLIST_PER_DAY,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, string> = {
      INVALID_PHONE: t(locale, "errPhoneInvalid"),
      DAY_CLOSED: t(locale, "waitlistDayClosed"),
      ALREADY_ON_LIST: t(locale, "waitlistAlready"),
      LIST_FULL: t(locale, "waitlistFull"),
    };
    return NextResponse.json(
      { error: map[code] || t(locale, "errServer") },
      { status: code && map[code] ? 409 : 500 },
    );
  }
}
