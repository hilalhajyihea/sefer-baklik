import { NextResponse } from "next/server";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 30);

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
