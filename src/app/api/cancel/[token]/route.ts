import { NextResponse } from "next/server";
import { cancelAppointmentByToken, sanitizeCancelToken } from "@/lib/cancel";
import { formatDateHe, formatTime } from "@/lib/time";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { token: rawToken } = await params;
  const token = sanitizeCancelToken(rawToken);
  if (!token || token.length < 6) {
    return NextResponse.json({ error: "קישור לא תקין", state: "invalid" }, { status: 400 });
  }

  const { state, appointment } = await cancelAppointmentByToken(token);

  if (state === "invalid") {
    return NextResponse.json({ error: "הקישור לא תקין", state }, { status: 404 });
  }

  if (state === "cannot_cancel") {
    return NextResponse.json(
      { error: "לא ניתן לבטל את התור הזה", state },
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
          dateLabel: formatDateHe(appointment.startsAt),
          timeLabel: formatTime(appointment.startsAt),
        }
      : null,
  });
}
