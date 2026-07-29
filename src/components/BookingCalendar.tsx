"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateHe, toDateKey, combineDateAndTime } from "@/lib/time";

type Props = {
  slug: string;
  displayName: string;
};

export function BookingCalendar({ slug, displayName }: Props) {
  const dates = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const todayKey = toDateKey();
    for (let i = 0; i < 14; i++) {
      const noon = combineDateAndTime(todayKey, "12:00");
      const d = new Date(noon.getTime() + i * 24 * 60 * 60 * 1000);
      const key = toDateKey(d);
      list.push({ key, label: formatDateHe(d) });
    }
    return list;
  }, []);

  const [date, setDate] = useState(dates[0]?.key || "");
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSlots(true);
      setTime("");
      setError("");
      try {
        const res = await fetch(
          `/api/availability?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots || []);
        }
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    if (date) load();
    return () => {
      cancelled = true;
    };
  }, [slug, date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date,
          time,
          customerName: name,
          customerPhone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "לא ניתן לקבוע תור");
        return;
      }
      let successMsg = `התור נקבע ל-${formatDateHe(combineDateAndTime(date, "12:00"))} בשעה ${time}. נתראה!`;
      if (data.sms?.ok && !data.sms?.skipped) {
        successMsg += " נשלח SMS לטלפון.";
      } else if (data.sms?.error) {
        setError(`התור נקבע, אבל SMS לא נשלח: ${data.sms.error}`);
      }
      setSuccess(successMsg);
      setName("");
      setPhone("");
      setTime("");
      const refresh = await fetch(
        `/api/availability?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}`,
      );
      const refreshed = await refresh.json();
      setSlots(refreshed.slots || []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="animate-fade-up mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
            ספר בקליק
          </p>
          <h1 className="font-display mt-1 text-4xl text-[var(--ink)] sm:text-5xl">
            {displayName}
          </h1>
          <p className="mt-2 text-[var(--muted)]">בחרו תאריך ושעה פנויה</p>
        </div>
        <Link
          href={`/${slug}/login`}
          className="shrink-0 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
        >
          מנהל
        </Link>
      </header>

      <form onSubmit={onSubmit} className="surface animate-fade-up rounded-2xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-[var(--ink)]">תאריך</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDate(d.key)}
              className={`min-w-[8.5rem] rounded-xl border px-3 py-3 text-right text-sm transition ${
                date === d.key
                  ? "border-[var(--copper)] bg-[var(--copper)] text-white"
                  : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[var(--copper)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <h2 className="mt-7 text-lg font-semibold text-[var(--ink)]">שעה</h2>
        {loadingSlots ? (
          <p className="mt-3 text-sm text-[var(--muted)]">טוען משבצות...</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            אין משבצות פנויות בתאריך זה
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTime(s)}
                className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                  time === s
                    ? "border-[var(--olive)] bg-[var(--olive)] text-white"
                    : "border-[var(--line)] bg-white/80 hover:border-[var(--olive)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            שם מלא
            <input
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--copper)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm font-medium">
            טלפון
            <input
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--copper)]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-lg bg-[var(--olive-soft)] px-3 py-2 text-sm text-[var(--olive)]">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!time || submitting}
          className="btn-primary mt-6 w-full rounded-xl py-3.5 text-base font-semibold sm:w-auto sm:px-10"
        >
          {submitting ? "שומר תור..." : "קביעת תור"}
        </button>
      </form>
    </div>
  );
}
