"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { CancelPageState } from "@/lib/cancel";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";

type AppointmentView = {
  barberName: string;
  barberSlug: string;
  dateLabel: string;
  timeLabel: string;
};

type Props = {
  token: string;
  initialState: CancelPageState;
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

export function CancelAppointmentPanel({
  token,
  initialState,
  appointment,
  locale: localeProp,
}: Props) {
  const locale = normalizeLocale(localeProp);
  const [state, setState] = useState<CancelPageState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirmCancel() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cancel/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        state?: CancelPageState;
        error?: string;
      };
      if (data.state === "success" || data.state === "already_cancelled") {
        setState(data.state);
        return;
      }
      if (data.state === "cannot_cancel" || data.state === "invalid") {
        setState(data.state);
        return;
      }
      setError(data.error || t(locale, "cancelFailed"));
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (state === "invalid") {
    return (
      <StatusBlock
        title={t(locale, "invalidLinkTitle")}
        body={t(locale, "invalidLinkBody")}
      />
    );
  }

  if (state === "already_cancelled" && appointment) {
    return (
      <StatusBlock
        title={t(locale, "alreadyCancelledTitle")}
        body={t(locale, "alreadyCancelledBody")}
      >
        {appointment.barberSlug ? (
          <Link
            href={`/${appointment.barberSlug}`}
            className="mt-6 inline-flex text-sm font-medium text-[var(--copper-deep)] underline-offset-2 hover:underline"
          >
            {t(locale, "bookAgain")}
          </Link>
        ) : null}
      </StatusBlock>
    );
  }

  if (state === "cannot_cancel" && appointment) {
    return (
      <StatusBlock
        title={t(locale, "cannotCancelTitle")}
        body={t(locale, "cannotCancelBody")}
      />
    );
  }

  if (state === "success" && appointment) {
    return (
      <StatusBlock
        title={t(locale, "cancelSuccessTitle")}
        body={t(locale, "cancelSuccessBody", { name: appointment.barberName })}
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
          {t(locale, "cancelHeading")}
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
          {t(locale, "cancelQuestion")}
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
            onClick={confirmCancel}
            className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold disabled:cursor-not-allowed"
          >
            {loading ? t(locale, "cancelling") : t(locale, "cancelCta")}
          </button>
          <Link
            href={`/${appointment.barberSlug}`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--ink)]/15 bg-transparent px-6 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--cream)] hover:text-[var(--ink)]"
          >
            {t(locale, "keepAppointment")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StatusBlock
      title={t(locale, "invalidLinkTitle")}
      body={t(locale, "invalidLinkBody")}
    />
  );
}
