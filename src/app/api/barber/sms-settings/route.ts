import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: {
      smsPlanEnabled: true,
      smsConfirmationEnabled: true,
      smsReminderEnabled: true,
      reminderMinutesBefore: true,
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({ settings: barber });
}

const schema = z.object({
  smsConfirmationEnabled: z.boolean(),
  smsReminderEnabled: z.boolean(),
  reminderMinutesBefore: z.number().int().min(5).max(1440),
});

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: { smsPlanEnabled: true },
  });
  if (!barber?.smsPlanEnabled) {
    return NextResponse.json(
      { error: "שירות SMS אינו פעיל במנוי שלך" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 },
    );
  }

  const settings = await prisma.barber.update({
    where: { id: session.barberId },
    data: parsed.data,
    select: {
      smsPlanEnabled: true,
      smsConfirmationEnabled: true,
      smsReminderEnabled: true,
      reminderMinutesBefore: true,
    },
  });

  return NextResponse.json({ settings });
}
