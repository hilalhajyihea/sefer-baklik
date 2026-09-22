"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { ConfirmPageState } from "@/lib/confirm";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";

type AppointmentView = {
  barberName: string;
  barberSlug: string;
  dateLabel: string;
  timeLabel: string;
};

type Props = {
  token: string;
  initialState: ConfirmPageState;
  appointment: AppointmentView | null;
  locale?: Locale | string;
};

function StatusBlock({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="surface mx-auto w-full max-w-md rounded-2xl px-6 py-8 text-center">
      <h1 className="font-display text-3xl text-[var(--ink)]">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">{body}</p>
      {children}
    </div>
  );
}

export function ConfirmAppointmentPanel({
  token,
  initialState,
  appointment,
  locale: localeProp,
}: Props) {
  const locale = normalizeLocale(localeProp);
  const [state, setState] = useState<ConfirmPageState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirmBooking() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        state?: ConfirmPageState;
        error?: string;
      };
      if (
        data.state === "success" ||
        data.state === "already_confirmed" ||
        data.state === "expired" ||
        data.state === "cancelled" ||
        data.state === "invalid"
      ) {
        setState(data.state);
        return;
      }
      setError(data.error || t(locale, "confirmFailed"));
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (state === "invalid") {
    return (
      <StatusBlock
        title={t(locale, "confirmInvalidTitle")}
        body={t(locale, "confirmInvalidBody")}
      />
    );
  }

  if (state === "expired") {
    return (
      <StatusBlock
        title={t(locale, "confirmExpiredTitle")}
        body={t(locale, "confirmExpiredBody")}
      >
        {appointment?.barberSlug ? (
          <Link
            href={`/${appointment.barberSlug}`}
            className="btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {t(locale, "bookAgain")}
          </Link>
        ) : null}
      </StatusBlock>
    );
  }

  if (state === "cancelled") {
    return (
      <StatusBlock
        title={t(locale, "confirmCancelledTitle")}
        body={t(locale, "confirmCancelledBody")}
      >
        {appointment?.barberSlug ? (
          <Link
            href={`/${appointment.barberSlug}`}
            className="btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {t(locale, "bookAgain")}
          </Link>
        ) : null}
      </StatusBlock>
    );
  }

  if (
    (state === "success" || state === "already_confirmed") &&
    appointment
  ) {
    return (
      <StatusBlock
        title={t(
          locale,
          state === "success" ? "confirmSuccessTitle" : "confirmAlreadyTitle",
        )}
        body={t(
          locale,
          state === "success" ? "confirmSuccessBody" : "confirmAlreadyBody",
          {
            name: appointment.barberName,
            date: appointment.dateLabel,
            time: appointment.timeLabel,
          },
        )}
      >
        <Link
          href={`/${appointment.barberSlug}`}
          className="btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
        >
          {t(locale, "bookAgain")}
        </Link>
      </StatusBlock>
    );
  }

  if (state === "confirm" && appointment) {
    return (
      <div
        lang={locale}
        className="surface mx-auto w-full max-w-md rounded-2xl px-6 py-8 text-center"
      >
        <h1 className="font-display text-3xl text-[var(--ink)]">
          {t(locale, "confirmHeading")}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
          {t(locale, "appointmentAt")}{" "}
          <span className="font-semibold text-[var(--ink)]">
            {appointment.barberName}
          </span>
          <br />
          <span className="mt-2 inline-block font-semibold text-[var(--ink)]">
            {appointment.dateLabel} {t(locale, "atTime")}{" "}
            {appointment.timeLabel}
          </span>
        </p>
        <p className="mt-6 text-lg font-medium text-[var(--ink)]">
          {t(locale, "confirmQuestion")}
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={confirmBooking}
            className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold disabled:cursor-not-allowed"
          >
            {loading ? t(locale, "confirming") : t(locale, "confirmCta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <StatusBlock
      title={t(locale, "confirmInvalidTitle")}
      body={t(locale, "confirmInvalidBody")}
    />
  );
}
