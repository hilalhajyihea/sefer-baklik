import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import {
  cancelAppointmentsForDayOff,
  countAppointmentsOnDay,
  restoreAppointmentsAfterDayOffRemoved,
} from "@/lib/dayOffAppointments";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDbDate, dbDateToDateKey, toDateKey } from "@/lib/time";

export async function GET(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const previewDate = searchParams.get("previewDate");
  if (previewDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(previewDate)) {
      const locale = await getBarberLocale(session.barberId);
      return NextResponse.json(
        { error: t(locale, "errDateInvalid") },
        { status: 400 },
      );
    }
    const count = await countAppointmentsOnDay({
      barberId: session.barberId,
      dateKey: previewDate,
    });
    return NextResponse.json({ date: previewDate, appointmentCount: count });
  }

  const from = dateKeyToDbDate(toDateKey());

  const dayOffs = await prisma.dayOff.findMany({
    where: { barberId: session.barberId, date: { gte: from } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ dayOffs });
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, "errDateInvalid") },
      { status: 400 },
    );
  }

  const date = dateKeyToDbDate(parsed.data.date);
  const existing = await prisma.dayOff.findUnique({
    where: {
      barberId_date: { barberId: session.barberId, date },
    },
  });

  const dayOff = await prisma.dayOff.upsert({
    where: {
      barberId_date: { barberId: session.barberId, date },
    },
    update: { note: parsed.data.note || null },
    create: {
      barberId: session.barberId,
      date,
      note: parsed.data.note || null,
    },
  });

  let cancelledCount = 0;
  let notifiedCount = 0;
  // Only cancel appointments when this day off is newly created
  if (!existing) {
    const result = await cancelAppointmentsForDayOff({
      barberId: session.barberId,
      dateKey: parsed.data.date,
    });
    cancelledCount = result.cancelledCount;
    notifiedCount = result.notifiedCount;
  }

  return NextResponse.json({
    dayOff,
    cancelledCount,
    notifiedCount,
  });
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
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t(locale, "errIdMissing") },
      { status: 400 },
    );
  }

  const existing = await prisma.dayOff.findFirst({
    where: { id: parsed.data.id, barberId: session.barberId },
  });
  if (!existing) {
    return NextResponse.json({ ok: true, restoredCount: 0, skippedCount: 0 });
  }

  const dateKey = dbDateToDateKey(existing.date);

  await prisma.dayOff.deleteMany({
    where: { id: parsed.data.id, barberId: session.barberId },
  });

  const restored = await restoreAppointmentsAfterDayOffRemoved({
    barberId: session.barberId,
    dateKey,
  });

  return NextResponse.json({
    ok: true,
    restoredCount: restored.restoredCount,
    skippedCount: restored.skippedCount,
  });
}
