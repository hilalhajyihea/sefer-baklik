import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import {
  createAdminBooking,
  createRecurringSeries,
  type RecurringInterval,
} from "@/lib/recurring";

const schema = z.object({
  mode: z.enum(["once", "recurring"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2).max(80),
  customerPhone: z
    .string()
    .min(9)
    .max(20)
    .regex(/^[\d+\-\s()]+$/),
  staffId: z.string().min(1).optional(),
  interval: z
    .enum(["WEEKLY", "BIWEEKLY", "TRIWEEKLY", "MONTHLY"])
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
      {
        error:
          parsed.error.issues[0]?.message || t(locale, "errInvalidData"),
      },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.mode === "once") {
      const appointment = await createAdminBooking({
        barberId: session.barberId,
        dateKey: parsed.data.date,
        time: parsed.data.time,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        staffId: parsed.data.staffId,
      });
      return NextResponse.json({
        ok: true,
        mode: "once",
        appointment: {
          id: appointment.id,
          startsAt: appointment.startsAt.toISOString(),
        },
      });
    }

    if (!parsed.data.interval || !parsed.data.endDate) {
      return NextResponse.json(
        { error: t(locale, "errRecurringFields") },
        { status: 400 },
      );
    }

    const result = await createRecurringSeries({
      barberId: session.barberId,
      staffId: parsed.data.staffId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      interval: parsed.data.interval as RecurringInterval,
      time: parsed.data.time,
      startDateKey: parsed.data.date,
      endDateKey: parsed.data.endDate,
    });

    return NextResponse.json({
      ok: true,
      mode: "recurring",
      seriesId: result.series.id,
      createdCount: result.createdCount,
      skipped: result.skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message || t(locale, "bookFailed") },
      { status: 409 },
    );
  }
}
