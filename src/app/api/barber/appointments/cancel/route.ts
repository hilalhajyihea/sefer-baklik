import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { notifyCustomerOfCancellation } from "@/lib/cancel";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, "errAppointmentIdMissing") },
      { status: 400 },
    );
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: parsed.data.id, barberId: session.barberId },
    include: {
      barber: {
        select: {
          displayName: true,
          locale: true,
          smsPlanEnabled: true,
          whatsappPlanEnabled: true,
        },
      },
      staff: { select: { displayName: true } },
    },
  });
  if (!appointment) {
    return NextResponse.json(
      { error: t(locale, "errAppointmentMissing") },
      { status: 404 },
    );
  }

  if (appointment.status === "CANCELLED") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  void notifyCustomerOfCancellation({
    id: appointment.id,
    barberId: appointment.barberId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    startsAt: appointment.startsAt,
    bookingGroupIndex: appointment.bookingGroupIndex,
    barber: appointment.barber,
    staff: appointment.staff,
  });

  return NextResponse.json({ ok: true });
}
