"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { CancelPageState } from "@/lib/cancel";

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
}: Props) {
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
      setError(data.error || "ביטול נכשל");
    } catch {
      setError("שגיאת רשת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  if (state === "invalid") {
    return (
      <StatusBlock
        title="הקישור לא תקין"
        body="לא מצאנו תור לקישור הזה. אם עדיין צריך לבטל — פנו לספר ישירות."
      />
    );
  }

  if (state === "already_cancelled" && appointment) {
    return (
      <StatusBlock
        title="התור כבר בוטל"
        body="התור הזה כבר בוטל בעבר. אין צורך לעשות דבר נוסף."
      >
        {appointment.barberSlug ? (
          <Link
            href={`/${appointment.barberSlug}`}
            className="mt-6 inline-flex text-sm font-medium text-[var(--copper-deep)] underline-offset-2 hover:underline"
          >
            לקביעת תור חדש
          </Link>
        ) : null}
      </StatusBlock>
    );
  }

  if (state === "cannot_cancel" && appointment) {
    return (
      <StatusBlock
        title="לא ניתן לבטל"
        body="לא ניתן לבטל את התור הזה (אולי כבר עבר או שאינו פעיל). לשאלות — פנו ישירות לספר."
      />
    );
  }

  if (state === "success" && appointment) {
    return (
      <StatusBlock
        title="התור בוטל"
        body={`התור אצל ${appointment.barberName} בוטל בהצלחה. השעה חזרה להיות פנויה.`}
      >
        <Link
          href={`/${appointment.barberSlug}`}
          className="btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
        >
          לקביעת תור חדש
        </Link>
      </StatusBlock>
    );
  }

  if (state === "confirm" && appointment) {
    return (
      <div className="surface mx-auto w-full max-w-md rounded-2xl px-6 py-8 text-center">
        <h1 className="font-display text-3xl text-[var(--ink)]">ביטול תור</h1>
        <p className="mt-5 text-base leading-relaxed text-[var(--muted)]">
          התור אצל{" "}
          <span className="font-semibold text-[var(--ink)]">
            {appointment.barberName}
          </span>
          <br />
          <span className="mt-2 inline-block font-semibold text-[var(--ink)]">
            {appointment.dateLabel} בשעה {appointment.timeLabel}
          </span>
        </p>
        <p className="mt-6 text-lg font-medium text-[var(--ink)]">
          לבטל את התור?
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
            {loading ? "מבטל…" : "ביטול התור"}
          </button>
          <Link
            href={`/${appointment.barberSlug}`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--ink)]/15 bg-transparent px-6 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--cream)] hover:text-[var(--ink)]"
          >
            לא, תודה — השארת התור
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StatusBlock
      title="הקישור לא תקין"
      body="לא מצאנו תור לקישור הזה. אם עדיין צריך לבטל — פנו לספר ישירות."
    />
  );
}
