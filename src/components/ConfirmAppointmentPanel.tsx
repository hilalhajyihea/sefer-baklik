"use client";

import Link from "next/link";
import { t, type Locale, type MsgKey } from "@/lib/i18n";

type State =
  | "success"
  | "already_confirmed"
  | "expired"
  | "cancelled"
  | "invalid";

type Props = {
  locale: Locale;
  state: State;
  appointment: {
    barberName: string;
    barberSlug: string;
    dateLabel: string;
    timeLabel: string;
  } | null;
};

const TITLE: Record<State, MsgKey> = {
  success: "confirmSuccessTitle",
  already_confirmed: "confirmAlreadyTitle",
  expired: "confirmExpiredTitle",
  cancelled: "confirmCancelledTitle",
  invalid: "confirmInvalidTitle",
};

const BODY: Record<State, MsgKey> = {
  success: "confirmSuccessBody",
  already_confirmed: "confirmAlreadyBody",
  expired: "confirmExpiredBody",
  cancelled: "confirmCancelledBody",
  invalid: "confirmInvalidBody",
};

export function ConfirmAppointmentPanel({
  locale,
  state,
  appointment,
}: Props) {
  const bodyVars =
    appointment &&
    (state === "success" || state === "already_confirmed")
      ? {
          name: appointment.barberName,
          date: appointment.dateLabel,
          time: appointment.timeLabel,
        }
      : undefined;

  return (
    <div className="surface-dark rounded-2xl p-6 sm:p-8 text-center">
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, TITLE[state])}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[rgba(248,243,236,0.7)]">
        {t(locale, BODY[state], bodyVars)}
      </p>
      {appointment?.barberSlug ? (
        <Link
          href={`/${appointment.barberSlug}`}
          className="btn-primary mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          {t(locale, "bookAgain")}
        </Link>
      ) : (
        <Link
          href="/"
          className="btn-primary mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          {t(locale, "backHome")}
        </Link>
      )}
    </div>
  );
}
