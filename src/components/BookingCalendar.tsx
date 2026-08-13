"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDateLocalized, normalizeLocale, t, type Locale } from "@/lib/i18n";
import { toDateKey, combineDateAndTime } from "@/lib/time";
import { BrandMark } from "@/components/BrandGraphics";

type StaffOption = {
  id: string;
  displayName: string;
};

type Props = {
  slug: string;
  displayName: string;
  logoUrl?: string | null;
  locale?: Locale | string;
  staff?: StaffOption[];
};

export function BookingCalendar({
  slug,
  displayName,
  logoUrl,
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
    <div className="shop-shell relative min-h-[100svh]" lang={locale}>
      {/* Full-bleed hero */}
      <section className="relative isolate min-h-[52svh] overflow-hidden sm:min-h-[58svh]">
        <Image
          src="/images/barber-hero-default.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#0e0b09] via-[rgba(18,14,11,0.62)] to-[rgba(18,14,11,0.28)]"
        />
        <div
          aria-hidden
          className="barber-stripes absolute inset-y-0 left-0 w-2 opacity-90 sm:w-3"
        />

        <div className="relative mx-auto flex min-h-[52svh] max-w-3xl flex-col justify-between px-4 py-5 sm:min-h-[58svh] sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <BrandMark tone="light" label={t(locale, "brand")} />
            <Link
              href={`/${slug}/login`}
              className="shrink-0 rounded-xl border border-white/25 bg-black/35 px-4 py-2 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/50"
            >
              {t(locale, "admin")}
            </Link>
          </div>

          <header className="animate-fade-up pb-10 pt-16 sm:pb-14 sm:pt-20">
            <p className="text-xs font-semibold tracking-[0.22em] text-[rgba(248,243,236,0.78)]">
              {t(locale, "bookTitle")}
            </p>
            {logoUrl ? (
              <div className="mt-4 flex w-full justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="h-auto max-h-24 w-auto max-w-full object-contain object-right sm:max-h-32"
                />
              </div>
            ) : (
              <h1 className="font-display mt-3 max-w-xl text-4xl leading-[1.08] text-[var(--cream)] sm:text-6xl">
                {displayName}
              </h1>
            )}
            <div className="mt-5 h-0.5 w-16 bg-[var(--copper)]" />
            <p className="mt-4 max-w-md text-base text-[rgba(248,243,236,0.82)] sm:text-lg">
              {t(locale, "pickDateTime")}
            </p>
          </header>
        </div>
      </section>

      {/* Booking panel */}
      <div className="relative -mt-8 pb-14 sm:-mt-10 sm:pb-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <form
            onSubmit={onSubmit}
            className="surface-dark animate-fade-up rounded-2xl p-5 sm:p-7"
          >
            {teamMode ? (
              <>
                <h2 className="text-lg font-semibold text-[var(--cream)]">
                  {t(locale, "pickStaff")}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffKey("any")}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      staffKey === "any"
                        ? "border border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                        : "shop-chip"
                    }`}
                  >
                    {t(locale, "staffAnyone")}
                  </button>
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffKey(s.id)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        staffKey === s.id
                          ? "border border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                          : "shop-chip"
                      }`}
                    >
                      {s.displayName}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <h2
              className={`text-lg font-semibold text-[var(--cream)] ${teamMode ? "mt-7" : ""}`}
            >
              {t(locale, "date")}
            </h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {dates.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDate(d.key)}
                  className={`min-w-[8.5rem] rounded-xl px-3 py-3 text-right text-sm transition ${
                    date === d.key
                      ? "border border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                      : "shop-chip"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <h2 className="mt-7 text-lg font-semibold text-[var(--cream)]">
              {t(locale, "time")}
            </h2>
            {loadingSlots ? (
              <p className="mt-3 text-sm text-[rgba(248,243,236,0.62)]">
                {t(locale, "loadingSlots")}
              </p>
            ) : slots.length === 0 ? (
              <p className="mt-3 text-sm text-[rgba(248,243,236,0.62)]">
                {t(locale, "noSlots")}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTime(s)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition ${
                      time === s
                        ? "border border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                        : "shop-chip"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--cream)]">
                {t(locale, "fullName")}
                <input
                  className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label className="block text-sm font-medium text-[var(--cream)]">
                {t(locale, "phone")}
                <input
                  className="shop-field mt-1.5 w-full rounded-xl px-3 py-2.5"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="mt-4 rounded-lg border border-[var(--olive)]/40 bg-[rgba(47,74,52,0.35)] px-3 py-2 text-sm text-[var(--olive-soft)]">
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

          <p className="mt-8 pb-2 text-center text-sm text-[rgba(248,243,236,0.62)]">
            <Link
              href="/"
              className="font-semibold text-[var(--copper)] underline-offset-2 transition hover:text-[var(--cream)] hover:underline"
            >
              {t(locale, "wantThisToo")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
