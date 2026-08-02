import type { Metadata } from "next";
import { CancelAppointmentPanel } from "@/components/CancelAppointmentPanel";
import {
  findAppointmentByCancelToken,
  resolveCancelState,
} from "@/lib/cancel";
import { formatDateHe, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "ביטול תור",
  robots: { index: false, follow: false },
};

export default async function CancelAppointmentPage({ params }: Props) {
  const { token } = await params;
  const appointment = token
    ? await findAppointmentByCancelToken(token)
    : null;
  const state = resolveCancelState(appointment);

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
