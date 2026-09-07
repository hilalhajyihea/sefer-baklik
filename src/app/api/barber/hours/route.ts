import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ALLOWED_SLOT_MINUTES } from "@/lib/slotMinutes";

const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

const schema = z.object({
  hours: z.array(hourSchema).length(7),
  slotMinutes: z
    .number()
    .int()
    .refine((v) => (ALLOWED_SLOT_MINUTES as readonly number[]).includes(v), {
      message: "אורך תור לא תקין",
    })
    .optional(),
});

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const [hours, barber] = await Promise.all([
    prisma.workingHours.findMany({
      where: { barberId: session.barberId },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.barber.findUnique({
      where: { id: session.barberId },
      select: { slotMinutes: true },
    }),
  ]);

  return NextResponse.json({
    hours,
    slotMinutes: barber?.slotMinutes ?? 30,
  });
}

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
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

  for (const h of parsed.data.hours) {
    if (h.enabled && h.startTime >= h.endTime) {
      return NextResponse.json(
        { error: t(locale, "errHoursOrder") },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { barberId: session.barberId } });
    const enabled = parsed.data.hours.filter((h) => h.enabled);
    if (enabled.length > 0) {
      await tx.workingHours.createMany({
        data: enabled.map((h) => ({
          barberId: session.barberId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      });
    }
    if (parsed.data.slotMinutes != null) {
      await tx.barber.update({
        where: { id: session.barberId },
        data: { slotMinutes: parsed.data.slotMinutes },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
