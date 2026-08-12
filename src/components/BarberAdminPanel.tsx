"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  dbDateToDateKey,
  formatTime,
  toDateKey,
} from "@/lib/time";
import { SITE_ADMIN_NAME, SITE_ADMIN_PHONE } from "@/lib/site";
import {
  dayNameLocalized,
  formatDateLocalized,
  normalizeLocale,
  t,
} from "@/lib/i18n";

type StaffMember = {
  id: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
};

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  staffId?: string | null;
  staff?: { id: string; displayName: string } | null;
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
  locale?: string;
};

const STAFF_COLORS = [
  "bg-[var(--copper)] text-white",
  "bg-[var(--olive)] text-white",
  "bg-[var(--ink)] text-white",
  "bg-[#5c6b8a] text-white",
];

const defaultHours = (): HourRow[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    enabled: dayOfWeek <= 4,
  }));

/** Template for loading from API: days missing in DB = disabled (not default-on). */
const blankHours = (): HourRow[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    enabled: false,
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

export function BarberAdminPanel({
  slug,
  displayName,
  locale: localeProp,
}: Props) {
  const locale = normalizeLocale(localeProp);
  const router = useRouter();
  const [tab, setTab] = useState<
    "appointments" | "book" | "hours" | "daysOff" | "sms"
  >("appointments");
  const [teamMode, setTeamMode] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [manageStaffId, setManageStaffId] = useState<string>("");
  const manageStaffIdRef = useRef(manageStaffId);
  manageStaffIdRef.current = manageStaffId;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hours, setHours] = useState<HourRow[]>(defaultHours());
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [smsPlanEnabled, setSmsPlanEnabled] = useState(false);
  const [smsConfirmationEnabled, setSmsConfirmationEnabled] = useState(true);
  const [smsReminderEnabled, setSmsReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(30);
  const [barberPhone, setBarberPhone] = useState("");
  const [notifyOnCustomerCancel, setNotifyOnCustomerCancel] = useState(true);
  const [offDate, setOffDate] = useState("");
  const [offNote, setOffNote] = useState("");
  const [bookMode, setBookMode] = useState<"once" | "recurring">("once");
  const [bookDate, setBookDate] = useState("");
  const [bookEndDate, setBookEndDate] = useState("");
  const [bookTime, setBookTime] = useState("10:00");
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookStaffId, setBookStaffId] = useState("");
  const [bookInterval, setBookInterval] = useState<
    "WEEKLY" | "BIWEEKLY" | "TRIWEEKLY" | "MONTHLY"
  >("WEEKLY");
  const [bookSlots, setBookSlots] = useState<string[]>([]);
  const [bookLoadingSlots, setBookLoadingSlots] = useState(false);
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeStaff = useMemo(
    () => staff.filter((s) => s.isActive),
    [staff],
  );

  const loadHoursAndDaysOff = useCallback(
    async (team: boolean, staffId: string) => {
      if (team && staffId) {
        const [hRes, dRes] = await Promise.all([
          fetch(`/api/barber/staff/hours?staffId=${encodeURIComponent(staffId)}`),
          fetch(
            `/api/barber/staff/days-off?staffId=${encodeURIComponent(staffId)}`,
          ),
        ]);
        const hData = await hRes.json();
        const dData = await dRes.json();
        const next = blankHours();
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
        return;
      }

      const [hRes, dRes] = await Promise.all([
        fetch("/api/barber/hours"),
        fetch("/api/barber/days-off"),
      ]);
      const hData = await hRes.json();
      const dData = await dRes.json();
      const next = blankHours();
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
    },
    [],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }
      setError("");
      try {
        const [aRes, sRes, staffRes] = await Promise.all([
          fetch("/api/barber/appointments"),
          fetch("/api/barber/sms-settings"),
          fetch("/api/barber/staff"),
        ]);
        if (aRes.status === 401) {
          router.push(`/${slug}/login`);
          return;
        }
        const aData = await aRes.json();
        const sData = await sRes.json();
        const staffData = await staffRes.json();
        setAppointments(aData.appointments || []);

        const nextTeam = !!staffData.teamMode;
        const nextStaff: StaffMember[] = staffData.staff || [];
        setTeamMode(nextTeam);
        setStaff(nextStaff);

        const active = nextStaff.filter((s) => s.isActive);
        let staffIdForHours = "";
        if (nextTeam && active.length > 0) {
          staffIdForHours = active.some(
            (s) => s.id === manageStaffIdRef.current,
          )
            ? manageStaffIdRef.current
            : active[0]!.id;
          setManageStaffId(staffIdForHours);
        } else {
          setManageStaffId("");
        }

        await loadHoursAndDaysOff(nextTeam, staffIdForHours);

        if (sData.settings) {
          setSmsPlanEnabled(!!sData.settings.smsPlanEnabled);
          setSmsConfirmationEnabled(!!sData.settings.smsConfirmationEnabled);
          setSmsReminderEnabled(!!sData.settings.smsReminderEnabled);
          setReminderMinutesBefore(sData.settings.reminderMinutesBefore ?? 30);
          setBarberPhone(sData.settings.phone || "");
          setNotifyOnCustomerCancel(
            sData.settings.notifyOnCustomerCancel !== false,
          );
        }
        if (nextTeam && active.length > 0) {
          setBookStaffId((prev) =>
            active.some((s) => s.id === prev) ? prev : active[0]!.id,
          );
        }
        setNowMs(Date.now());
      } catch {
        setError(t(locale, "loadError"));
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [router, slug, locale, loadHoursAndDaysOff],
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

  useEffect(() => {
    if (!teamMode || !manageStaffId) return;
    let cancelled = false;
    (async () => {
      try {
        await loadHoursAndDaysOff(true, manageStaffId);
      } catch {
        if (!cancelled) setError(t(locale, "loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamMode, manageStaffId, loadHoursAndDaysOff, locale]);

  useEffect(() => {
    if (!bookDate) {
      setBookSlots([]);
      return;
    }
    let cancelled = false;
    async function loadSlots() {
      setBookLoadingSlots(true);
      try {
        const params = new URLSearchParams({ slug, date: bookDate });
        if (teamMode && bookStaffId) params.set("staff", bookStaffId);
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          const slots: string[] = data.slots || [];
          setBookSlots(slots);
          if (slots.length && !slots.includes(bookTime)) {
            setBookTime(slots[0]!);
          }
        }
      } catch {
        if (!cancelled) setBookSlots([]);
      } finally {
        if (!cancelled) setBookLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [slug, bookDate, bookStaffId, teamMode]);

  const filteredAppointments = useMemo(() => {
    if (!teamMode || staffFilter === "all") return appointments;
    return appointments.filter((a) => a.staffId === staffFilter);
  }, [appointments, teamMode, staffFilter]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const a of filteredAppointments) {
      const key = toDateKey(new Date(a.startsAt));
      const list = groups.get(key) || [];
      list.push(a);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAppointments]);

  const nextUpcomingId = useMemo(() => {
    const upcoming = filteredAppointments.find(
      (a) => new Date(a.startsAt).getTime() > nowMs,
    );
    return upcoming?.id ?? null;
  }, [filteredAppointments, nowMs]);

  function staffColor(staffId: string | null | undefined) {
    if (!staffId) return "bg-[var(--muted)] text-white";
    const idx = activeStaff.findIndex((s) => s.id === staffId);
    return STAFF_COLORS[idx >= 0 ? idx % STAFF_COLORS.length : 0];
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}`);
    router.refresh();
  }

  async function cancelAppointment(id: string) {
    if (!confirm(t(locale, "confirmCancel"))) return;
    const res = await fetch("/api/barber/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError(t(locale, "cancelFailed"));
      return;
    }
    setMessage(t(locale, "cancelled"));
    load({ silent: true });
  }

  async function saveHours(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch(
      teamMode ? "/api/barber/staff/hours" : "/api/barber/hours",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          teamMode ? { staffId: manageStaffId, hours } : { hours },
        ),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(locale, "saveFailed"));
      return;
    }
    setMessage(t(locale, "hoursSaved"));
  }

  async function addDayOff(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch(
      teamMode ? "/api/barber/staff/days-off" : "/api/barber/days-off",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          teamMode
            ? {
                staffId: manageStaffId,
                date: offDate,
                note: offNote || undefined,
              }
            : { date: offDate, note: offNote || undefined },
        ),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(locale, "addFailed"));
      return;
    }
    setOffDate("");
    setOffNote("");
    setMessage(t(locale, "dayOffAdded"));
    await loadHoursAndDaysOff(teamMode, manageStaffId);
  }

  async function saveSmsSettings(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/barber/sms-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: barberPhone,
        notifyOnCustomerCancel,
        ...(smsPlanEnabled
          ? {
              smsConfirmationEnabled,
              smsReminderEnabled,
              reminderMinutesBefore,
            }
          : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t(locale, "smsSaveFailed"));
      return;
    }
    setMessage(t(locale, "smsSaved"));
  }

  async function submitAdminBook(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setBookSubmitting(true);
    try {
      const res = await fetch("/api/barber/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: bookMode,
          date: bookDate,
          time: bookTime,
          customerName: bookName,
          customerPhone: bookPhone,
          ...(teamMode && bookStaffId ? { staffId: bookStaffId } : {}),
          ...(bookMode === "recurring"
            ? { interval: bookInterval, endDate: bookEndDate }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(locale, "bookFailed"));
        return;
      }
      if (data.mode === "recurring") {
        const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
        setMessage(
          skipped > 0
            ? t(locale, "bookRecurringPartial", { count: data.createdCount })
            : t(locale, "bookRecurringSuccess", { count: data.createdCount }),
        );
      } else {
        setMessage(t(locale, "bookAdminSuccess"));
      }
      setBookName("");
      setBookPhone("");
      load({ silent: true });
    } catch {
      setError(t(locale, "networkError"));
    } finally {
      setBookSubmitting(false);
    }
  }

  async function removeDayOff(id: string) {
    await fetch(
      teamMode ? "/api/barber/staff/days-off" : "/api/barber/days-off",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      },
    );
    setMessage(t(locale, "dayOffRemoved"));
    await loadHoursAndDaysOff(teamMode, manageStaffId);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8" lang={locale}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "adminEyebrow")}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">{displayName}</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t(locale, "autoRefresh")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${slug}`}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            {t(locale, "publicCalendar")}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            {t(locale, "logout")}
          </button>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["appointments", "tabAppointments"],
            ["book", "tabBook"],
            ["hours", "tabHours"],
            ["daysOff", "tabDaysOff"],
            ["sms", "tabSms"],
          ] as const
        ).map(([key, labelKey]) => (
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
            {t(locale, labelKey)}
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
        <p className="text-[var(--muted)]">{t(locale, "loading")}</p>
      ) : (
        <div className="surface rounded-2xl p-5 sm:p-6">
          {tab === "appointments" && (
            <div className="space-y-8">
              {teamMode ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffFilter("all")}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      staffFilter === "all"
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[var(--line)] bg-white/80"
                    }`}
                  >
                    {t(locale, "filterAllStaff")}
                  </button>
                  {activeStaff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffFilter(s.id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        staffFilter === s.id
                          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                          : "border-[var(--line)] bg-white/80"
                      }`}
                    >
                      {s.displayName}
                    </button>
                  ))}
                </div>
              ) : null}

              {groupedByDay.length === 0 ? (
                <p className="text-[var(--muted)]">
                  {t(locale, "noAppointments")}
                </p>
              ) : (
                groupedByDay.map(([dateKey, dayAppointments]) => {
                  const labelDate = new Date(dayAppointments[0].startsAt);
                  const isToday = dateKey === toDateKey(new Date(nowMs));
                  return (
                    <section key={dateKey}>
                      <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--line)] pb-2">
                        <h2 className="font-display text-2xl text-[var(--ink)]">
                          {formatDateLocalized(locale, labelDate)}
                        </h2>
                        {isToday ? (
                          <span className="rounded-full bg-[var(--copper)] px-2.5 py-0.5 text-xs font-semibold text-white">
                            {t(locale, "today")}
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
                                  {teamMode && a.staff ? (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${staffColor(a.staffId)}`}
                                    >
                                      {a.staff.displayName}
                                    </span>
                                  ) : null}
                                  {isCurrent ? (
                                    <span className="rounded-full bg-[var(--copper)] px-2 py-0.5 text-xs font-semibold text-white">
                                      {t(locale, "nowInShop")}
                                    </span>
                                  ) : null}
                                  {isNext ? (
                                    <span className="rounded-full bg-[var(--olive)] px-2 py-0.5 text-xs font-semibold text-white">
                                      {t(locale, "nextUp")}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-[var(--muted)]">
                                  {a.customerName}
                                  {a.customerPhone?.trim() ? (
                                    <>
                                      {" · "}
                                      <a
                                        href={`tel:${a.customerPhone.replace(/[^\d+]/g, "")}`}
                                        dir="ltr"
                                        className="font-medium text-[var(--copper-deep)] underline-offset-2 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {a.customerPhone}
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cancelAppointment(a.id)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                              >
                                {t(locale, "cancelAppointment")}
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

          {tab === "book" && (
            <form onSubmit={submitAdminBook} className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBookMode("once")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    bookMode === "once"
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--line)] bg-white/80"
                  }`}
                >
                  {t(locale, "bookOnce")}
                </button>
                <button
                  type="button"
                  onClick={() => setBookMode("recurring")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    bookMode === "recurring"
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--line)] bg-white/80"
                  }`}
                >
                  {t(locale, "bookRecurring")}
                </button>
              </div>

              {teamMode ? (
                <label className="block text-sm font-medium">
                  {t(locale, "pickStaff")}
                  <select
                    required
                    value={bookStaffId}
                    onChange={(e) => setBookStaffId(e.target.value)}
                    className="mt-1.5 w-full max-w-md rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                  >
                    {activeStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t(locale, "fullName")}
                  <input
                    required
                    minLength={2}
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  {t(locale, "phoneOptional")}
                  <input
                    inputMode="tel"
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  {t(locale, "date")}
                  <input
                    type="date"
                    required
                    min={toDateKey()}
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  {t(locale, "time")}
                  {bookLoadingSlots ? (
                    <p className="mt-1.5 text-sm text-[var(--muted)]">
                      {t(locale, "loadingSlots")}
                    </p>
                  ) : (
                    <select
                      required
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                      disabled={!bookDate || bookSlots.length === 0}
                    >
                      {bookSlots.length === 0 ? (
                        <option value="">
                          {bookDate ? t(locale, "noSlots") : "—"}
                        </option>
                      ) : (
                        bookSlots.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </label>
              </div>

              {bookMode === "recurring" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t(locale, "bookRecurring")}
                    <select
                      value={bookInterval}
                      onChange={(e) =>
                        setBookInterval(
                          e.target.value as
                            | "WEEKLY"
                            | "BIWEEKLY"
                            | "TRIWEEKLY"
                            | "MONTHLY",
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                    >
                      <option value="WEEKLY">
                        {t(locale, "intervalWeekly")}
                      </option>
                      <option value="BIWEEKLY">
                        {t(locale, "intervalBiweekly")}
                      </option>
                      <option value="TRIWEEKLY">
                        {t(locale, "intervalTriweekly")}
                      </option>
                      <option value="MONTHLY">
                        {t(locale, "intervalMonthly")}
                      </option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    {t(locale, "endDate")}
                    <input
                      type="date"
                      required
                      min={bookDate || toDateKey()}
                      value={bookEndDate}
                      onChange={(e) => setBookEndDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                    />
                  </label>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  bookSubmitting ||
                  !bookDate ||
                  !bookTime ||
                  bookSlots.length === 0 ||
                  (teamMode && !bookStaffId)
                }
                className="btn-primary rounded-xl px-6 py-2.5 font-semibold"
              >
                {bookSubmitting
                  ? t(locale, "bookAdminSaving")
                  : t(locale, "bookAdminCta")}
              </button>
            </form>
          )}

          {(tab === "hours" || tab === "daysOff") && teamMode ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeStaff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setManageStaffId(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    manageStaffId === s.id
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--line)] bg-white/80"
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          ) : null}

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
                    {dayNameLocalized(locale, h.dayOfWeek)}
                  </label>
                  <span className="hidden text-xs text-[var(--muted)] sm:inline">
                    {t(locale, "active")}
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
                {t(locale, "saveHours")}
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
                  {t(locale, "date")}
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
                  {t(locale, "noteOptional")}
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
                  {t(locale, "add")}
                </button>
              </form>

              <div className="space-y-2">
                {dayOffs.length === 0 ? (
                  <p className="text-[var(--muted)]">
                    {t(locale, "noDaysOff")}
                  </p>
                ) : (
                  dayOffs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {formatDateLocalized(
                            locale,
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
                        {t(locale, "remove")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "sms" && (
            <div className="space-y-6">
              <form onSubmit={saveSmsSettings} className="space-y-5">
                <label className="block text-sm font-medium">
                  {t(locale, "barberPhone")}
                  <input
                    value={barberPhone}
                    onChange={(e) => setBarberPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="05..."
                    className="mt-1.5 w-full max-w-sm rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
                  />
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {t(locale, "barberPhoneHint")}
                  </span>
                </label>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={notifyOnCustomerCancel}
                    onChange={(e) =>
                      setNotifyOnCustomerCancel(e.target.checked)
                    }
                  />
                  {t(locale, "notifyCancelToggle")}
                </label>

                {smsPlanEnabled ? (
                  <>
                    <p className="text-sm text-[var(--muted)]">
                      {t(locale, "smsHelp")}
                    </p>
                    <label className="flex items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={smsConfirmationEnabled}
                        onChange={(e) =>
                          setSmsConfirmationEnabled(e.target.checked)
                        }
                      />
                      {t(locale, "smsConfirmToggle")}
                    </label>
                    <label className="flex items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={smsReminderEnabled}
                        onChange={(e) =>
                          setSmsReminderEnabled(e.target.checked)
                        }
                      />
                      {t(locale, "smsReminderToggle")}
                    </label>
                    <label className="block text-sm font-medium">
                      {t(locale, "reminderMinutes")}
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        step={5}
                        disabled={!smsReminderEnabled}
                        value={reminderMinutesBefore}
                        onChange={(e) =>
                          setReminderMinutesBefore(
                            Number(e.target.value) || 30,
                          )
                        }
                        className="mt-1.5 w-full max-w-[12rem] rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 disabled:opacity-40"
                      />
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {t(locale, "reminderHint")}
                      </span>
                    </label>
                  </>
                ) : (
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white/80 p-4">
                    <h3 className="text-base font-semibold text-[var(--ink)]">
                      {t(locale, "smsServiceTitle")}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {t(locale, "smsUpgrade", {
                        name: SITE_ADMIN_NAME,
                        phone: SITE_ADMIN_PHONE,
                      })}
                    </p>
                    <a
                      href={`tel:${SITE_ADMIN_PHONE}`}
                      className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
                    >
                      {t(locale, "contactAdmin", { name: SITE_ADMIN_NAME })}
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary rounded-xl px-6 py-2.5 font-semibold"
                >
                  {t(locale, "saveSettings")}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
