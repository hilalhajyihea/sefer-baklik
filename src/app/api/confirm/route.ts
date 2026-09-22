import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmPendingAppointment,
  findAppointmentByConfirmToken,
  resolveConfirmState,
  type ConfirmPageState,
} from "@/lib/confirm";
import {
  formatDateLocalized,
  normalizeLocale,
  t,
  type MsgKey,
} from "@/lib/i18n";
import { formatTime } from "@/lib/time";

const STATE_MSG: Record<ConfirmPageState, MsgKey> = {
  confirm: "confirmState_confirm",
  success: "confirmState_success",
  already_confirmed: "confirmState_already_confirmed",
  expired: "confirmState_expired",
  cancelled: "confirmState_cancelled",
  invalid: "confirmState_invalid",
};

function appointmentPayload(
  appointment: NonNullable<
    Awaited<ReturnType<typeof findAppointmentByConfirmToken>>
  >,
) {
  const locale = normalizeLocale(appointment.barber.locale);
  return {
    barberName: appointment.barber.displayName,
    barberSlug: appointment.barber.slug,
    dateLabel: formatDateLocalized(locale, appointment.startsAt),
    timeLabel: formatTime(appointment.startsAt),
    locale,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const appointment = await findAppointmentByConfirmToken(token);
  const state = resolveConfirmState(appointment);
  const locale = normalizeLocale(appointment?.barber.locale);

  return NextResponse.json({
    state,
    locale,
    appointment: appointment ? appointmentPayload(appointment) : null,
    message: t(locale, STATE_MSG[state]),
  });
}

const postSchema = z.object({
  token: z.string().min(6),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("he", "errInvalidData") },
      { status: 400 },
    );
  }

  const result = await confirmPendingAppointment(parsed.data.token);
  const locale = normalizeLocale(result.appointment?.barber.locale);

  return NextResponse.json({
    state: result.state,
    locale,
    appointment: result.appointment
      ? appointmentPayload(result.appointment)
      : null,
    message: t(locale, STATE_MSG[result.state]),
  });
}
