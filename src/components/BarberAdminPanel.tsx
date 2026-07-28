"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dayName, formatDateHe, formatTime, toDateKey } from "@/lib/time";

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

export function BarberAdminPanel({ slug, displayName }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"appointments" | "hours" | "daysOff">(
    "appointments",
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hours, setHours] = useState<HourRow[]>(defaultHours());
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [offDate, setOffDate] = useState("");
  const [offNote, setOffNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [aRes, hRes, dRes] = await Promise.all([
        fetch("/api/barber/appointments"),
        fetch("/api/barber/hours"),
        fetch("/api/barber/days-off"),
      ]);
      if (aRes.status === 401) {
        router.push(`/${slug}/login`);
        return;
      }
      const aData = await aRes.json();
      const hData = await hRes.json();
      const dData = await dRes.json();
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
    } catch {
      setError("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }, [router, slug]);

  useEffect(() => {
    load();
  }, [load]);

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
    load();
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
    load();
  }

  async function removeDayOff(id: string) {
    await fetch("/api/barber/days-off", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("יום החופש הוסר");
    load();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">ספר בקליק · ניהול</p>
          <h1 className="font-display text-3xl sm:text-4xl">{displayName}</h1>
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
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-[var(--muted)]">אין תורים קרובים</p>
              ) : (
                appointments.map((a) => {
                  const starts = new Date(a.startsAt);
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {formatDateHe(starts)} · {formatTime(starts)}
                        </p>
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
              <form onSubmit={addDayOff} className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-medium">
                  תאריך
                  <input
                    type="date"
                    required
                    value={offDate}
                    min={toDateKey(new Date())}
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
                          {formatDateHe(new Date(d.date))}
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
        </div>
      )}
    </div>
  );
}
