import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "מזהה תור חסר" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: parsed.data.id, barberId: session.barberId },
  });
  if (!appointment) {
    return NextResponse.json({ error: "תור לא נמצא" }, { status: 404 });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
