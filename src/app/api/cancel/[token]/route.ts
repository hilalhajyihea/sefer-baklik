import { NextResponse } from "next/server";
import { cancelAppointmentByToken, sanitizeCancelToken } from "@/lib/cancel";
import { formatDateLocalized, normalizeLocale, t } from "@/lib/i18n";
import { formatTime } from "@/lib/time";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { token: rawToken } = await params;
  const token = sanitizeCancelToken(rawToken);
  if (!token || token.length < 6) {
    return NextResponse.json(
      { error: t("he", "errCancelLink"), state: "invalid" },
      { status: 400 },
    );
  }

  const { state, appointment } = await cancelAppointmentByToken(token);
  const locale = normalizeLocale(appointment?.barber.locale);

  if (state === "invalid") {
    return NextResponse.json(
      { error: t(locale, "errCancelLink"), state },
      { status: 404 },
    );
  }

  if (state === "cannot_cancel") {
    return NextResponse.json(
      { error: t(locale, "errCannotCancel"), state },
      { status: 409 },
    );
  }

  // success | already_cancelled
  return NextResponse.json({
    ok: true,
    state,
    appointment: appointment
      ? {
          barberName: appointment.barber.displayName,
          barberSlug: appointment.barber.slug,
          startsAt: appointment.startsAt.toISOString(),
          dateLabel: formatDateLocalized(locale, appointment.startsAt),
          timeLabel: formatTime(appointment.startsAt),
        }
      : null,
  });
}
