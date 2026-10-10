"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDateLocalized, normalizeLocale, t, type Locale } from "@/lib/i18n";
import { MAX_PARTY_SIZE } from "@/lib/partyBooking";
import { isValidIlMobile05 } from "@/lib/sms";
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
  const [partySize, setPartySize] = useState(1);
  const [slots, setSlots] = useState<string[]>([]);
  const [waitlistAvailable, setWaitlistAvailable] = useState(false);
  const [waitlistFull, setWaitlistFull] = useState(false);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingConfirmToken, setPendingConfirmToken] = useState<string | null>(
    null,
  );
  const [pendingConfirmMeta, setPendingConfirmMeta] = useState<{
    dateLabel: string;
    time: string;
    minutes: number;
  } | null>(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [confirmCodeSubmitting, setConfirmCodeSubmitting] = useState(false);
  const [confirmCodeError, setConfirmCodeError] = useState("");
  const confirmCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSlots(true);
      setTime("");
      setError("");
      try {
        const params = new URLSearchParams({ slug, date });
        if (teamMode && staffKey) params.set("staff", staffKey);
        if (partySize > 1) params.set("partySize", String(partySize));
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setSlots(data.slots || []);
          setWaitlistAvailable(Boolean(data.waitlistAvailable));
          setWaitlistFull(Boolean(data.waitlistFull));
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setWaitlistAvailable(false);
          setWaitlistFull(false);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    if (date) load();
    return () => {
      cancelled = true;
    };
  }, [slug, date, staffKey, teamMode, partySize]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!isValidIlMobile05(phone)) {
      setError(t(locale, "errPhoneInvalid"));
      return;
    }
    setSubmitting(true);
    try {
      if (waitlistAvailable && slots.length === 0) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            date,
            customerName: name,
            customerPhone: phone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t(locale, "bookFailed"));
          return;
        }
        setSuccess(t(locale, "waitlistSuccess"));
        setName("");
        setPhone("");
        const count = data.count || 0;
        const max = data.max || 5;
        setWaitlistAvailable(count < max);
        setWaitlistFull(count >= max);
        return;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date,
          time,
          customerName: name,
          customerPhone: phone,
          ...(partySize > 1 ? { partySize } : {}),
          ...(teamMode ? { staff: staffKey || "any" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "bookFailed"));
        return;
      }
      if (data.needsConfirmCode && data.confirmToken) {
        // No green "success" yet — modal makes clear booking is pending OTP.
        setSuccess("");
        setPendingConfirmToken(data.confirmToken);
        setPendingConfirmMeta({
          dateLabel: formatDateLocalized(
            locale,
            combineDateAndTime(date, "12:00"),
          ),
          time,
          minutes: data.confirmMinutes || 15,
        });
        setConfirmCodeInput("");
        setConfirmCodeError("");
        setError("");
      } else if (data.needsConfirm) {
        setPendingConfirmToken(null);
        setPendingConfirmMeta(null);
        let successMsg = t(locale, "bookNeedsConfirm", {
          date: formatDateLocalized(locale, combineDateAndTime(date, "12:00")),
          time,
          minutes: data.confirmMinutes || 15,
        });
        if (data.sms?.ok && !data.sms?.skipped) {
          successMsg += t(locale, "bookNeedsConfirmSms");
        }
        if (data.whatsapp?.ok && !data.whatsapp?.skipped) {
          successMsg += t(locale, "bookNeedsConfirmWhatsapp");
        }
        setSuccess(successMsg);
        setError("");
      } else {
        setPendingConfirmToken(null);
        setPendingConfirmMeta(null);
        let successMsg = t(locale, "bookSuccess", {
          date: formatDateLocalized(locale, combineDateAndTime(date, "12:00")),
          time,
        });
        if (data.sms?.ok && !data.sms?.skipped) {
          successMsg += t(locale, "bookSuccessSms");
        }
        if (data.whatsapp?.ok && !data.whatsapp?.skipped) {
          successMsg += t(locale, "bookSuccessWhatsapp");
        }
        setSuccess(successMsg);

        const waFailed =
          data.whatsapp &&
          !(data.whatsapp.ok && !data.whatsapp.skipped) &&
          data.whatsapp.error;
        const smsFailed =
          data.sms &&
          !(data.sms.ok && !data.sms.skipped) &&
          data.sms.error;
        if (waFailed) {
          setError(
            t(locale, "bookSuccessWhatsappFail", {
              error: data.whatsapp.error,
            }),
          );
        } else if (smsFailed) {
          setError(
            t(locale, "bookSuccessSmsFail", { error: data.sms.error }),
          );
        }
      }
      setName("");
      setPhone("");
      setTime("");
      setPartySize(1);
      const params = new URLSearchParams({ slug, date });
      if (teamMode && staffKey) params.set("staff", staffKey);
      const refresh = await fetch(`/api/availability?${params.toString()}`);
      const refreshed = await refresh.json();
      setSlots(refreshed.slots || []);
      setWaitlistAvailable(Boolean(refreshed.waitlistAvailable));
      setWaitlistFull(Boolean(refreshed.waitlistFull));
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!pendingConfirmToken) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      confirmCodeInputRef.current?.focus();
    }, 80);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [pendingConfirmToken]);

  async function verifyConfirmCode(code: string) {
    if (!pendingConfirmToken || confirmCodeSubmitting) return;
    const cleaned = code.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length < 4) return;
    setConfirmCodeError("");
    setConfirmCodeSubmitting(true);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: pendingConfirmToken,
          code: cleaned,
        }),
      });
      const data = await res.json();
      if (data.state === "success" || data.state === "already_confirmed") {
        const slot =
          pendingConfirmMeta != null
            ? t(locale, "bookConfirmCodeModalSlot", {
                date: pendingConfirmMeta.dateLabel,
                time: pendingConfirmMeta.time,
              })
            : "";
        setSuccess(
          slot
            ? `${t(locale, "bookConfirmCodeSuccess")} ${slot}`
            : t(locale, "bookConfirmCodeSuccess"),
        );
        setPendingConfirmToken(null);
        setPendingConfirmMeta(null);
        setConfirmCodeInput("");
        setConfirmCodeError("");
        return;
      }
      setConfirmCodeError(
        data.error || data.message || t(locale, "bookConfirmCodeWrong"),
      );
      setConfirmCodeInput("");
      confirmCodeInputRef.current?.focus();
    } catch {
      setConfirmCodeError(t(locale, "networkError"));
    } finally {
      setConfirmCodeSubmitting(false);
    }
  }

  async function submitConfirmCode(e: FormEvent) {
    e.preventDefault();
    await verifyConfirmCode(confirmCodeInput);
  }

  const waitlistMode = !loadingSlots && slots.length === 0 && waitlistAvailable;

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
              {t(locale, "partySize")}
            </h2>
            <p className="mt-1 text-xs text-[rgba(248,243,236,0.55)]">
              {t(locale, "partySizeHint")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: MAX_PARTY_SIZE }, (_, i) => i + 1).map(
                (n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPartySize(n)}
                    className={`min-w-[2.75rem] rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      partySize === n
                        ? "border border-[var(--copper)] bg-[var(--copper)] text-white shadow-md"
                        : "shop-chip"
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
            </div>

            <h2 className="mt-7 text-lg font-semibold text-[var(--cream)]">
              {t(locale, "time")}
            </h2>
            {loadingSlots ? (
              <p className="mt-3 text-sm text-[rgba(248,243,236,0.62)]">
                {t(locale, "loadingSlots")}
              </p>
            ) : slots.length === 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-[rgba(248,243,236,0.62)]">
                  {t(locale, "noSlots")}
                </p>
                {waitlistMode ? (
                  <p className="text-sm text-[rgba(248,243,236,0.75)]">
                    {t(locale, "waitlistHelp")}
                  </p>
                ) : null}
                {waitlistFull ? (
                  <p className="text-sm text-amber-200/90">
                    {t(locale, "waitlistFull")}
                  </p>
                ) : null}
              </div>
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

            {(waitlistMode || slots.length > 0) && !waitlistFull ? (
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
            ) : null}

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

            {(waitlistMode || slots.length > 0) && !waitlistFull ? (
            <button
              type="submit"
              disabled={
                submitting ||
                (teamMode && !staffKey) ||
                (!waitlistMode && !time)
              }
              className="btn-primary mt-6 w-full rounded-xl py-3.5 text-base font-semibold sm:w-auto sm:px-10"
            >
              {submitting
                ? waitlistMode
                  ? t(locale, "waitlistSaving")
                  : t(locale, "bookingSaving")
                : waitlistMode
                  ? t(locale, "waitlistCta")
                  : t(locale, "bookCta")}
            </button>
            ) : null}
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

      {pendingConfirmToken && pendingConfirmMeta ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-code-title"
          lang={locale}
        >
          <form
            onSubmit={submitConfirmCode}
            className="flex max-h-[100svh] w-full max-w-md flex-col rounded-t-3xl border border-white/15 bg-[var(--ink)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-3xl sm:px-7 sm:py-8"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25 sm:hidden" />
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-amber-200/90">
              {t(locale, "bookConfirmCodeModalTitle")}
            </p>
            <h2
              id="confirm-code-title"
              className="mt-2 text-center font-display text-2xl text-[var(--cream)]"
            >
              {t(locale, "bookConfirmCodeModalSlot", {
                date: pendingConfirmMeta.dateLabel,
                time: pendingConfirmMeta.time,
              })}
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[rgba(248,243,236,0.78)]">
              {t(locale, "bookConfirmCodeModalHint", {
                minutes: pendingConfirmMeta.minutes,
              })}
            </p>

            <label className="mt-6 block text-center text-sm font-medium text-[var(--cream)]">
              {t(locale, "bookConfirmCodeLabel")}
              <input
                ref={confirmCodeInputRef}
                className="shop-field mt-3 w-full rounded-2xl px-3 py-4 text-center text-3xl font-semibold tracking-[0.45em] text-[var(--cream)]"
                value={confirmCodeInput}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setConfirmCodeInput(next);
                  if (next.length === 6) {
                    void verifyConfirmCode(next);
                  }
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                enterKeyHint="done"
                required
                minLength={4}
                maxLength={6}
                dir="ltr"
                aria-invalid={confirmCodeError ? true : undefined}
              />
            </label>

            {confirmCodeError ? (
              <p className="mt-3 rounded-xl border border-red-400/35 bg-red-950/70 px-3 py-2.5 text-center text-sm text-red-100">
                {confirmCodeError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                confirmCodeSubmitting || confirmCodeInput.length < 4
              }
              className="btn-primary mt-6 w-full rounded-2xl py-4 text-lg font-semibold disabled:opacity-50"
            >
              {confirmCodeSubmitting
                ? t(locale, "bookConfirmCodeSubmitting")
                : t(locale, "bookConfirmCodeCta")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
