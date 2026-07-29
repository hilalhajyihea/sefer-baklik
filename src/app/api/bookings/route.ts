import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/reminders";

const schema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2, "נא להזין שם מלא").max(80),
  customerPhone: z
    .string()
    .min(9, "נא להזין טלפון תקין")
    .max(20)
    .regex(/^[\d+\-\s()]+$/, "טלפון לא תקין"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (!barber || !barber.isActive) {
      return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
    }

    const appointment = await bookAppointment({
      barberId: barber.id,
      dateKey: parsed.data.date,
      time: parsed.data.time,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
    });

    const sms = await sendBookingConfirmation(appointment.id);

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        startsAt: appointment.startsAt.toISOString(),
        customerName: appointment.customerName,
      },
      sms: {
        ok: !!sms?.ok,
        skipped: !!sms?.skipped,
        error: sms?.error || null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "לא ניתן לקבוע תור";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
