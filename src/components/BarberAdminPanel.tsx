"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  dayName,
  dbDateToDateKey,
  formatDateHe,
  formatTime,
  toDateKey,
} from "@/lib/time";
import { SITE_ADMIN_NAME, SITE_ADMIN_PHONE, SMS_UPGRADE_MESSAGE } from "@/lib/site";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
};

type HourRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

type DayOff = {
  id: string;
  date: string;
  note: string | null;
};

type Props = {
  slug: string;
  displayName: string;
};

const defaultHours = (): HourRow[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    enabled: dayOfWeek <= 4,
  }));

function appointmentStatus(
  startsAt: string,
  endsAt: string,
  now: number,
): "past" | "current" | "upcoming" | "next" {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now >= start && now < end) return "current";
  if (end <= now) return "past";
  return "upcoming";
}

export function BarberAdminPanel({ slug, displayName }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "appointments" | "hours" | "daysOff" | "sms"
  >("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hours, setHours] = useState<HourRow[]>(defaultHours());
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [smsPlanEnabled, setSmsPlanEnabled] = useState(false);
  const [smsConfirmationEnabled, setSmsConfirmationEnabled] = useState(true);
  const [smsReminderEnabled, setSmsReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(30);
  const [offDate, setOffDate] = useState("");
  const [offNote, setOffNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }
      setError("");
      try {
        const [aRes, hRes, dRes, sRes] = await Promise.all([
          fetch("/api/barber/appointments"),
          fetch("/api/barber/hours"),
          fetch("/api/barber/days-off"),
          fetch("/api/barber/sms-settings"),
        ]);
        if (aRes.status === 401) {
          router.push(`/${slug}/login`);
          return;
        }
        const aData = await aRes.json();
        const hData = await hRes.json();
        const dData = await dRes.json();
        const sData = await sRes.json();
        setAppointments(aData.appointments || []);

        const next = defaultHours();
        for (const h of hData.hours || []) {
          next[h.dayOfWeek] = {
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime,
            endTime: h.endTime,
            enabled: true,
          };
        }
        setHours(next);
        setDayOffs(dData.dayOffs || []);
        if (sData.settings) {
          setSmsPlanEnabled(!!sData.settings.smsPlanEnabled);
          setSmsConfirmationEnabled(!!sData.settings.smsConfirmationEnabled);
          setSmsReminderEnabled(!!sData.settings.smsReminderEnabled);
          setReminderMinutesBefore(sData.settings.reminderMinutesBefore ?? 30);
        }
        setNowMs(Date.now());
      } catch {
        setError("שגיאה בטעינת הנתונים");
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [router, slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      load({ silent: true });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = toDateKey(new Date(a.startsAt));
      const list = groups.get(key) || [];
      list.push(a);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  const nextUpcomingId = useMemo(() => {
    const upcoming = appointments.find(
      (a) => new Date(a.startsAt).getTime() > nowMs,
    );
    return upcoming?.id ?? null;
  }, [appointments, nowMs]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
    router.refresh();
  }

  async function cancelAppointment(id: string) {
    if (!confirm("לבטל את התור?")) return;
    const res = await fetch("/api/barber/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("ביטול נכשל");
      return;
    }
    setMessage("התור בוטל");
    load({ silent: true });
  }

  async function saveHours(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/barber/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "שמירה נכשלה");
      return;
    }
    setMessage("שעות הפעילות עודכנו");
  }

  async function addDayOff(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/barber/days-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: offDate, note: offNote || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "הוספה נכשלה");
      return;
    }
    setOffDate("");
    setOffNote("");
    setMessage("יום חופש נוסף");
    load({ silent: true });
  }

  async function saveSmsSettings(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/barber/sms-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smsConfirmationEnabled,
        smsReminderEnabled,
        reminderMinutesBefore,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "שמירת הגדרות SMS נכשלה");
      return;
    }
    setMessage("הגדרות ההודעות נשמרו");
  }

  async function removeDayOff(id: string) {
    await fetch("/api/barber/days-off", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("יום החופש הוסר");
    load({ silent: true });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">ספר בקליק · ניהול</p>
          <h1 className="font-display text-3xl sm:text-4xl">{displayName}</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            מתרענן אוטומטית כל דקה
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${slug}`}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            ליומן הציבורי
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            יציאה
          </button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["appointments", "תורים"],
            ["hours", "שעות פעילות"],
            ["daysOff", "ימי חופש"],
            ["sms", "הודעות SMS"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mb-4 rounded-lg bg-[var(--olive-soft)] px-3 py-2 text-sm text-[var(--olive)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[var(--muted)]">טוען...</p>
      ) : (
        <div className="surface rounded-2xl p-5 sm:p-6">
          {tab === "appointments" && (
            <div className="space-y-8">
              {groupedByDay.length === 0 ? (
                <p className="text-[var(--muted)]">אין תורים קרובים</p>
              ) : (
                groupedByDay.map(([dateKey, dayAppointments]) => {
                  const labelDate = new Date(dayAppointments[0].startsAt);
                  const isToday = dateKey === toDateKey(new Date(nowMs));
                  return (
                    <section key={dateKey}>
                      <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--line)] pb-2">
                        <h2 className="font-display text-2xl text-[var(--ink)]">
                          {formatDateHe(labelDate)}
                        </h2>
                        {isToday ? (
                          <span className="rounded-full bg-[var(--copper)] px-2.5 py-0.5 text-xs font-semibold text-white">
                            היום
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {dayAppointments.map((a) => {
                          const status = appointmentStatus(
                            a.startsAt,
                            a.endsAt,
                            nowMs,
                          );
                          const isCurrent = status === "current";
                          const isNext =
                            status === "upcoming" && a.id === nextUpcomingId;
                          return (
                            <div
                              key={a.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                                isCurrent
                                  ? "border-[var(--copper)] bg-[rgba(182,92,44,0.14)] shadow-[0_0_0_1px_rgba(182,92,44,0.25)]"
                                  : isNext
                                    ? "border-[var(--olive)] bg-[var(--olive-soft)]"
                                    : status === "past"
                                      ? "border-[var(--line)] bg-white/50 opacity-60"
                                      : "border-[var(--line)] bg-white/80"
                              }`}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">
                                    {formatTime(new Date(a.startsAt))}–
                                    {formatTime(new Date(a.endsAt))}
                                  </p>
                                  {isCurrent ? (
                                    <span className="rounded-full bg-[var(--copper)] px-2 py-0.5 text-xs font-semibold text-white">
                                      עכשיו במספרה
                                    </span>
                                  ) : null}
                                  {isNext ? (
                                    <span className="rounded-full bg-[var(--olive)] px-2 py-0.5 text-xs font-semibold text-white">
                                      הבא בתור
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-[var(--muted)]">
                                  {a.customerName} · {a.customerPhone}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cancelAppointment(a.id)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                              >
                                ביטול תור
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          )}

          {tab === "hours" && (
            <form onSubmit={saveHours} className="space-y-3">
              {hours.map((h) => (
                <div
                  key={h.dayOfWeek}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 sm:grid-cols-[7rem_auto_1fr_1fr]"
                >
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => {
                        const next = [...hours];
                        next[h.dayOfWeek] = {
                          ...h,
                          enabled: e.target.checked,
                        };
                        setHours(next);
                      }}
                    />
                    {dayName(h.dayOfWeek)}
                  </label>
                  <span className="hidden text-xs text-[var(--muted)] sm:inline">
                    פעיל
                  </span>
                  <input
                    type="time"
                    disabled={!h.enabled}
                    value={h.startTime}
                    onChange={(e) => {
                      const next = [...hours];
                      next[h.dayOfWeek] = { ...h, startTime: e.target.value };
                      setHours(next);
                    }}
                    className="rounded-lg border border-[var(--line)] px-2 py-1.5 disabled:opacity-40"
                  />
                  <input
                    type="time"
                    disabled={!h.enabled}
                    value={h.endTime}
                    onChange={(e) => {
                      const next = [...hours];
                      next[h.dayOfWeek] = { ...h, endTime: e.target.value };
                      setHours(next);
                    }}
                    className="rounded-lg border border-[var(--line)] px-2 py-1.5 disabled:opacity-40"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="btn-primary mt-2 rounded-xl px-6 py-2.5 font-semibold"
              >
                שמירת שעות
              </button>
            </form>
          )}

          {tab === "daysOff" && (
            <div className="space-y-5">
              <form
                onSubmit={addDayOff}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="text-sm font-medium">
                  תאריך
                  <input
                    type="date"
                    required
                    value={offDate}
                    min={toDateKey()}
                    onChange={(e) => setOffDate(e.target.value)}
                    className="mt-1 block rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  />
                </label>
                <label className="text-sm font-medium">
                  הערה (אופציונלי)
                  <input
                    value={offNote}
                    onChange={(e) => setOffNote(e.target.value)}
                    className="mt-1 block rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary rounded-xl px-5 py-2.5 font-semibold"
                >
                  הוספה
                </button>
              </form>

              <div className="space-y-2">
                {dayOffs.length === 0 ? (
                  <p className="text-[var(--muted)]">אין ימי חופש קרובים</p>
                ) : (
                  dayOffs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {formatDateHe(
                            new Date(
                              `${dbDateToDateKey(new Date(d.date))}T12:00:00Z`,
                            ),
                          )}
                        </p>
                        {d.note ? (
                          <p className="text-sm text-[var(--muted)]">{d.note}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDayOff(d.id)}
                        className="text-sm font-medium text-red-700"
                      >
                        הסרה
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "sms" && (
            smsPlanEnabled ? (
            <form onSubmit={saveSmsSettings} className="space-y-5">
              <p className="text-sm text-[var(--muted)]">
                הלקוח מקבל SMS באישור התור, ותזכורת לפני התור. ניתן לכבות או
                לשנות את זמן התזכורת.
              </p>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={smsConfirmationEnabled}
                  onChange={(e) => setSmsConfirmationEnabled(e.target.checked)}
                />
                שליחת SMS באישור קביעת תור
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={smsReminderEnabled}
                  onChange={(e) => setSmsReminderEnabled(e.target.checked)}
                />
                שליחת SMS תזכורת לפני התור
              </label>
              <label className="block text-sm font-medium">
                דקות לפני התור לתזכורת
                <input
                  type="number"
                  min={5}
                  max={1440}
                  step={5}
                  disabled={!smsReminderEnabled}
                  value={reminderMinutesBefore}
                  onChange={(e) =>
                    setReminderMinutesBefore(Number(e.target.value) || 30)
                  }
                  className="mt-1.5 w-full max-w-[12rem] rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 disabled:opacity-40"
                />
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  ברירת מחדל: 30 דקות (מינימום 5)
                </span>
              </label>
              <button
                type="submit"
                className="btn-primary rounded-xl px-6 py-2.5 font-semibold"
              >
                שמירת הגדרות
              </button>
            </form>
            ) : (
            <div className="space-y-4 rounded-xl border border-[var(--line)] bg-white/80 p-5">
              <h3 className="text-lg font-semibold text-[var(--ink)]">
                שירות הודעות SMS
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {SMS_UPGRADE_MESSAGE}
              </p>
              <a
                href={`tel:${SITE_ADMIN_PHONE}`}
                className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                צור קשר עם {SITE_ADMIN_NAME}
              </a>
            </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
