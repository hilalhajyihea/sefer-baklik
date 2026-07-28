import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

const schema = z.object({
  hours: z.array(hourSchema).length(7),
});

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const hours = await prisma.workingHours.findMany({
    where: { barberId: session.barberId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ hours });
}

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  for (const h of parsed.data.hours) {
    if (h.enabled && h.startTime >= h.endTime) {
      return NextResponse.json(
        { error: "שעת התחלה חייבת להיות לפני שעת סיום" },
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
  });

  return NextResponse.json({ ok: true });
}
