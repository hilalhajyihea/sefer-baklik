import { NextResponse } from "next/server";
import { requireBarberSession } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { startOfJerusalemDay, toDateKey } from "@/lib/time";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const from = startOfJerusalemDay(toDateKey());
  const to = new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: session.barberId,
      status: "BOOKED",
      startsAt: { gte: from, lt: to },
    },
    orderBy: { startsAt: "asc" },
    include: {
      staff: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json({ appointments });
}
