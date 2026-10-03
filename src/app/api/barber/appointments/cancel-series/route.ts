import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { notifyCustomerOfCancellation } from "@/lib/cancel";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { startOfJerusalemDay, toDateKey } from "@/lib/time";

const schema = z.object({
  seriesId: z.string().min(1),
});

/**
 * Cancel all upcoming BOOKED appointments in a recurring series at once.
 * Past occurrences are left unchanged. Marks the series inactive.
 * Sends one customer cancel SMS per upcoming occurrence (when SMS plan on).
 */
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
      { error: t(locale, "errIdMissing") },
      { status: 400 },
    );
  }

  const series = await prisma.recurringSeries.findFirst({
    where: {
      id: parsed.data.seriesId,
      barberId: session.barberId,
    },
  });
  if (!series) {
    return NextResponse.json(
      { error: t(locale, "errSeriesMissing") },
      { status: 404 },
    );
  }

  const from = startOfJerusalemDay(toDateKey());

  const toCancel = await prisma.appointment.findMany({
    where: {
      seriesId: series.id,
      barberId: session.barberId,
      status: "BOOKED",
      startsAt: { gte: from },
    },
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
    orderBy: { startsAt: "asc" },
  });

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.updateMany({
      where: {
        seriesId: series.id,
        barberId: session.barberId,
        status: "BOOKED",
        startsAt: { gte: from },
      },
      data: { status: "CANCELLED" },
    });

    await tx.recurringSeries.update({
      where: { id: series.id },
      data: { isActive: false },
    });

    return updated.count;
  });

  // One SMS for the series (earliest upcoming) — avoids N messages for every occurrence
  const first = toCancel[0];
  if (first) {
    void notifyCustomerOfCancellation({
      id: first.id,
      barberId: first.barberId,
      customerName: first.customerName,
      customerPhone: first.customerPhone,
      startsAt: first.startsAt,
      bookingGroupIndex: first.bookingGroupIndex,
      barber: first.barber,
      staff: first.staff,
    });
  }

  return NextResponse.json({ ok: true, cancelledCount: result });
}
