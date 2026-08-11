"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateLocalized, normalizeLocale, t, type Locale } from "@/lib/i18n";
import { toDateKey, combineDateAndTime } from "@/lib/time";
import { BrandMark, ScissorsMark } from "@/components/BrandGraphics";

type StaffOption = {
  id: string;
  displayName: string;
};

type Props = {
  slug: string;
  displayName: string;
  locale?: Locale | string;
  staff?: StaffOption[];
};

export function BookingCalendar({
  slug,
  displayName,
  locale: localeProp,
  staff = [],
}: Props) {
  const locale = normalizeLocale(localeProp);
  const teamMode = staff.length >= 2;
  const dates = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const todayKey = toDateKey();
    for (let i = 0; i < 14; i++) {
      const noon = combineDateAndTime(todayKey, "12:00");
      const d = new Date(noon.getTime() + i * 24 * 60 * 60 * 1000);
      const key = toDateKey(d);
      list.push({ key, label: formatDateLocalized(locale, d) });
    }
    return list;
  }, [locale]);

  const [staffKey, setStaffKey] = useState(teamMode ? "any" : "");
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
        const params = new URLSearchParams({ slug, date });
        if (teamMode && staffKey) params.set("staff", staffKey);
        const res = await fetch(`/api/availability?${params.toString()}`);
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
  }, [slug, date, staffKey, teamMode]);

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
          ...(teamMode ? { staff: staffKey || "any" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "bookFailed"));
        return;
      }
      let successMsg = t(locale, "bookSuccess", {
        date: formatDateLocalized(locale, combineDateAndTime(date, "12:00")),
        time,
      });
      if (data.sms?.ok && !data.sms?.skipped) {
        successMsg += t(locale, "bookSuccessSms");
      } else if (data.sms?.error) {
        setError(
          t(locale, "bookSuccessSmsFail", { error: data.sms.error }),
        );
      }
      setSuccess(successMsg);
      setName("");
      setPhone("");
      setTime("");
      const params = new URLSearchParams({ slug, date });
      if (teamMode && staffKey) params.set("staff", staffKey);
      const refresh = await fetch(`/api/availability?${params.toString()}`);
      const refreshed = await refresh.json();
      setSlots(refreshed.slots || []);
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden" lang={locale}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="barber-stripes-soft absolute inset-0" />
        <div className="grain absolute inset-0" />
        <ScissorsMark className="absolute left-[-1rem] top-24 h-40 w-40 text-[var(--copper)] opacity-[0.08] sm:left-4" />
      </div>

      <div className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--charcoal)] text-[var(--cream)]">
        <div className="barber-stripes animate-stripe absolute inset-y-0 left-0 w-2 opacity-90 sm:w-3" />
        <div className="relative mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <BrandMark
            tone="light"
            label={t(locale, "brand")}
            initials={locale === "ar" ? "حب" : "סב"}
          />
          <Link
            href={`/${slug}/login`}
            className="shrink-0 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--cream)] transition hover:bg-white/10"
          >
            {t(locale, "admin")}
          </Link>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <header className="animate-fade-up mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--copper-deep)]">
            {t(locale, "bookTitle")}
          </p>
          <h1 className="font-display mt-2 text-4xl text-[var(--ink)] sm:text-5xl">
            {displayName}
          </h1>
          <div className="mt-4 h-0.5 w-16 origin-right bg-[var(--copper)]" />
          <p className="mt-3 text-[var(--muted)]">{t(locale, "pickDateTime")}</p>
        </header>

        <form
          onSubmit={onSubmit}
          className="surface animate-fade-up rounded-2xl p-5 sm:p-7"
          style={{ animationDelay: "80ms" }}
        >
          {teamMode ? (
            <>
              <h2 className="text-lg font-semibold text-[var(--ink)]">
                {t(locale, "pickStaff")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStaffKey("any")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    staffKey === "any"
                      ? "border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                      : "border-[var(--line)] bg-white/80 hover:border-[var(--copper)]"
                  }`}
                >
                  {t(locale, "staffAnyone")}
                </button>
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStaffKey(s.id)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      staffKey === s.id
                        ? "border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                        : "border-[var(--line)] bg-white/80 hover:border-[var(--copper)]"
                    }`}
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <h2
            className={`text-lg font-semibold text-[var(--ink)] ${teamMode ? "mt-7" : ""}`}
          >
            {t(locale, "date")}
          </h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDate(d.key)}
                className={`min-w-[8.5rem] rounded-xl border px-3 py-3 text-right text-sm transition ${
                  date === d.key
                    ? "border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                    : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[var(--copper)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-lg font-semibold text-[var(--ink)]">
            {t(locale, "time")}
          </h2>
          {loadingSlots ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t(locale, "loadingSlots")}
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t(locale, "noSlots")}
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
                      ? "border-[var(--olive)] bg-[var(--olive)] text-white shadow-md"
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
              {t(locale, "fullName")}
              <input
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--copper)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm font-medium">
              {t(locale, "phone")}
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
            disabled={!time || submitting || (teamMode && !staffKey)}
            className="btn-primary mt-6 w-full rounded-xl py-3.5 text-base font-semibold sm:w-auto sm:px-10"
          >
            {submitting ? t(locale, "bookingSaving") : t(locale, "bookCta")}
          </button>
        </form>
      </div>
    </div>
  );
}
