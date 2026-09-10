import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import {
  updateRecurringSeries,
  type RecurringInterval,
} from "@/lib/recurring";

const schema = z.object({
  seriesId: z.string().min(1),
  interval: z.enum(["WEEKLY", "BIWEEKLY", "TRIWEEKLY", "MONTHLY"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

/**
 * Edit an active recurring series (interval / time).
 * Past occurrences stay; upcoming BOOKED appointments are rebuilt.
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
      { error: t(locale, "errInvalidData") },
      { status: 400 },
    );
  }

  try {
    const result = await updateRecurringSeries({
      seriesId: parsed.data.seriesId,
      barberId: session.barberId,
      interval: parsed.data.interval as RecurringInterval,
      time: parsed.data.time,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missing =
      message.includes("לא נמצאה") || message.includes("غير");
    return NextResponse.json(
      {
        error:
          message ||
          (missing ? t(locale, "errSeriesMissing") : t(locale, "editSeriesFailed")),
      },
      { status: missing ? 404 : 409 },
    );
  }
}
