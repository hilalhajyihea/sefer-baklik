import { CancelAppointmentPanel } from "@/components/CancelAppointmentPanel";
import {
  findAppointmentByCancelToken,
  resolveCancelState,
} from "@/lib/cancel";
import { formatDateHe, formatTime } from "@/lib/time";

export async function CancelTokenPage({ rawToken }: { rawToken: string }) {
  const appointment = rawToken
    ? await findAppointmentByCancelToken(rawToken)
    : null;
  const state = resolveCancelState(appointment);
  const token = appointment?.cancelToken || rawToken;

  return (
    <main className="relative flex flex-1 flex-col px-6 py-16 sm:py-24">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-lg">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper-deep)]">
          ספר בקליק
        </p>
        <CancelAppointmentPanel
          token={token}
          initialState={state}
          appointment={
            appointment
              ? {
                  barberName: appointment.barber.displayName,
                  barberSlug: appointment.barber.slug,
                  dateLabel: formatDateHe(appointment.startsAt),
                  timeLabel: formatTime(appointment.startsAt),
                }
              : null
          }
        />
      </div>
    </main>
  );
}
