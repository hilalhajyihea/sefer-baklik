import { NextResponse } from "next/server";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfJerusalemDay, toDateKey } from "@/lib/time";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
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
  });

  return NextResponse.json({ appointments });
}
