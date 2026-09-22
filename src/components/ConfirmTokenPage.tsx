import { ConfirmAppointmentPanel } from "@/components/ConfirmAppointmentPanel";
import {
  confirmPendingAppointment,
  findAppointmentByConfirmToken,
  resolveConfirmState,
  type ConfirmPageState,
} from "@/lib/confirm";
import { formatDateLocalized, normalizeLocale, t } from "@/lib/i18n";
import { formatTime } from "@/lib/time";

type PanelState =
  | "success"
  | "already_confirmed"
  | "expired"
  | "cancelled"
  | "invalid";

function toPanelState(state: ConfirmPageState): PanelState {
  return state === "confirm" ? "invalid" : state;
}

export async function ConfirmTokenPage({ rawToken }: { rawToken: string }) {
  // Opening the link confirms (no extra button) — matches product: click = booked
  const result = rawToken
    ? await confirmPendingAppointment(rawToken)
    : { state: "invalid" as const, appointment: null };

  let appointment = result.appointment;
  let state = toPanelState(result.state);

  if (!appointment && rawToken) {
    appointment = await findAppointmentByConfirmToken(rawToken);
    state = toPanelState(resolveConfirmState(appointment));
  }

  const locale = normalizeLocale(appointment?.barber.locale);

  return (
    <main
      lang={locale}
      className="relative flex flex-1 flex-col px-6 py-16 sm:py-24"
    >
      <div className="grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-lg">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper-deep)]">
          {t(locale, "brand")}
        </p>
        <ConfirmAppointmentPanel
          locale={locale}
          state={state}
          appointment={
            appointment
              ? {
                  barberName: appointment.barber.displayName,
                  barberSlug: appointment.barber.slug,
                  dateLabel: formatDateLocalized(locale, appointment.startsAt),
                  timeLabel: formatTime(appointment.startsAt),
                }
              : null
          }
        />
      </div>
    </main>
  );
}
