import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDbDate, toDateKey } from "@/lib/time";
import { MAX_WAITLIST_PER_DAY } from "@/lib/waitlist";

export async function GET(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: t(locale, "errDateInvalid") }, { status: 400 });
    }
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        barberId: session.barberId,
        date: dateKeyToDbDate(date),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      date,
      entries,
      max: MAX_WAITLIST_PER_DAY,
    });
  }

  const from = dateKeyToDbDate(toDateKey());
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      barberId: session.barberId,
      date: { gte: from },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      date: true,
      customerName: true,
      customerPhone: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ entries, max: MAX_WAITLIST_PER_DAY });
}

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, "errIdMissing") }, { status: 400 });
  }

  await prisma.waitlistEntry.deleteMany({
    where: { id: parsed.data.id, barberId: session.barberId },
  });

  return NextResponse.json({ ok: true });
}
