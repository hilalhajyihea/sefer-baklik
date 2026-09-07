import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { startOfJerusalemDay, toDateKey } from "@/lib/time";

const schema = z.object({
  seriesId: z.string().min(1),
});

/**
 * Cancel all upcoming BOOKED appointments in a recurring series at once.
 * Past occurrences are left unchanged. Marks the series inactive.
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

  return NextResponse.json({ ok: true, cancelledCount: result });
}
