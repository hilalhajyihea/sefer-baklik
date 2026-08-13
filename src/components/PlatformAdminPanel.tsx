"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StaffMember = {
  id: string;
  displayName: string;
  isActive: boolean;
  sortOrder: number;
};

type Barber = {
  id: string;
  slug: string;
  displayName: string;
  username: string;
  isActive: boolean;
  locale: string;
  smsPlanEnabled: boolean;
  customerCancelEnabled: boolean;
  smsQuota: number;
  smsRemaining: number;
  logoUrl: string | null;
  logoMimeType: string | null;
  slotMinutes: number;
  _count: { appointments: number };
  staff: StaffMember[];
};

export function PlatformAdminPanel() {
  const router = useRouter();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expandedStaffFor, setExpandedStaffFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/barbers");
      if (res.status === 401) {
        router.push("/platform/login");
        return;
      }
      const data = await res.json();
      setBarbers(data.barbers || []);
    } catch {
      setError("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/platform/login");
  }

  async function createBarber(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/platform/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, displayName, username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "יצירה נכשלה");
      return;
    }
    setMessage(`הספר נוצר — כתובת: /${data.barber.slug}`);
    setSlug("");
    setDisplayName("");
    setUsername("");
    setPassword("");
    load();
  }

  async function toggleActive(barber: Barber) {
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id, isActive: !barber.isActive }),
    });
    if (!res.ok) {
      setError("עדכון נכשל");
      return;
    }
    setMessage(barber.isActive ? "הספר הושבת" : "הספר הופעל");
    load();
  }

  async function toggleSmsPlan(barber: Barber) {
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: barber.id,
        smsPlanEnabled: !barber.smsPlanEnabled,
      }),
    });
    if (!res.ok) {
      setError("עדכון SMS נכשל");
      return;
    }
    setMessage(
      barber.smsPlanEnabled ? "שירות SMS הושבת לספר" : "שירות SMS הופעל לספר",
    );
    load();
  }

  async function setSmsQuota(barber: Barber) {
    const quotaRaw = prompt(
      `מכסת SMS חודשית עבור ${barber.displayName} (כרגע ${barber.smsRemaining}/${barber.smsQuota})\nבראשון לחודש היתרה מתאפסת למכסה`,
      String(barber.smsQuota || 100),
    );
    if (quotaRaw == null) return;
    const quota = Number(quotaRaw);
    if (!Number.isFinite(quota) || quota < 0) {
      setError("מכסה לא תקינה");
      return;
    }
    const remRaw = prompt(
      "יתרה נוכחית (השאירו ריק = שווה למכסה)",
      String(quota),
    );
    if (remRaw == null) return;
    const remaining =
      remRaw.trim() === "" ? undefined : Number(remRaw);
    if (
      remaining !== undefined &&
      (!Number.isFinite(remaining) || remaining < 0)
    ) {
      setError("יתרה לא תקינה");
      return;
    }
    setError("");
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: barber.id,
        smsQuota: Math.floor(quota),
        ...(remaining !== undefined
          ? { smsRemaining: Math.floor(remaining) }
          : {}),
      }),
    });
    if (!res.ok) {
      setError("עדכון מכסת SMS נכשל");
      return;
    }
    setMessage(`מכסה חודשית עודכנה ל־${Math.floor(quota)}`);
    load();
  }

  async function addSmsCredits(barber: Barber) {
    const raw = prompt(
      `כמה הודעות להוסיף לחודש הנוכחי ל־${barber.displayName}? (יתרה כרגע ${barber.smsRemaining}; המכסה החודשית נשארת ${barber.smsQuota})`,
      "100",
    );
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 1) {
      setError("כמות לא תקינה");
      return;
    }
    setError("");
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: barber.id,
        smsCreditsAdd: Math.floor(amount),
      }),
    });
    if (!res.ok) {
      setError("הוספת קרדיטים נכשלה");
      return;
    }
    setMessage(`נוספו ${Math.floor(amount)} הודעות SMS`);
    load();
  }

  async function uploadLogo(barber: Barber, file: File | null) {
    if (!file) return;
    setError("");
    const form = new FormData();
    form.set("barberId", barber.id);
    form.set("file", file);
    const res = await fetch("/api/platform/barbers/logo", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "העלאת לוגו נכשלה");
      return;
    }
    setMessage(`לוגו עודכן ל־${barber.displayName} (השם נשאר להודעות SMS)`);
    load();
  }

  async function removeLogo(barber: Barber) {
    if (!barber.logoMimeType && !barber.logoUrl) return;
    if (!confirm(`להסיר את הלוגו של ${barber.displayName}? השם יוצג שוב באתר.`)) {
      return;
    }
    setError("");
    const res = await fetch("/api/platform/barbers/logo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "הסרת לוגו נכשלה");
      return;
    }
    setMessage(`הלוגו הוסר — באתר יוצג שוב השם: ${barber.displayName}`);
    load();
  }

  async function toggleCustomerCancel(barber: Barber) {
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: barber.id,
        customerCancelEnabled: !barber.customerCancelEnabled,
      }),
    });
    if (!res.ok) {
      setError("עדכון ביטול תור נכשל");
      return;
    }
    setMessage(
      barber.customerCancelEnabled
        ? "ביטול תור בהודעות הושבת לספר"
        : "ביטול תור בהודעות הופעל לספר",
    );
    load();
  }

  async function toggleLocale(barber: Barber) {
    const nextLocale = barber.locale === "ar" ? "he" : "ar";
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id, locale: nextLocale }),
    });
    if (!res.ok) {
      setError("עדכון שפה נכשל");
      return;
    }
    setMessage(
      nextLocale === "ar"
        ? "שפת האתר של הספר עודכנה לערבית"
        : "שפת האתר של הספר עודכנה לעברית",
    );
    load();
  }

  async function renameDisplayName(barber: Barber) {
    const next = prompt("שם תצוגה חדש", barber.displayName);
    if (next == null) return;
    const trimmed = next.trim();
    if (trimmed.length < 2) {
      setError("שם תצוגה חייב להיות לפחות 2 תווים");
      return;
    }
    if (trimmed === barber.displayName) return;
    setError("");
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id, displayName: trimmed }),
    });
    if (!res.ok) {
      setError("עדכון שם התצוגה נכשל");
      return;
    }
    setMessage(`שם התצוגה עודכן ל־${trimmed}`);
    load();
  }

  async function resetPassword(barber: Barber) {
    const next = prompt(`סיסמה חדשה עבור ${barber.displayName}`);
    if (!next || next.length < 6) return;
    const res = await fetch("/api/platform/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id, password: next }),
    });
    if (!res.ok) {
      setError("איפוס סיסמה נכשל");
      return;
    }
    setMessage("הסיסמה עודכנה");
  }

  async function addStaff(barber: Barber) {
    const name = prompt("שם הספר בצוות (למשל: יוסי)");
    if (!name || name.trim().length < 2) return;
    setError("");
    const res = await fetch("/api/platform/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: barber.id,
        displayName: name.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "הוספת ספר לצוות נכשלה");
      return;
    }
    const teamHint =
      data.teamMode
        ? " — מצב צוות פעיל (מסך הזמנה + יומן משולב)"
        : data.activeCount === 1
          ? " — הוסיפו לפחות עוד ספר אחד כדי להפעיל מצב צוות"
          : "";
    setMessage(`נוסף לצוות: ${data.staff.displayName}${teamHint}`);
    setExpandedStaffFor(barber.id);
    load();
  }

  async function renameStaff(staff: StaffMember) {
    const next = prompt("שם חדש לספר בצוות", staff.displayName);
    if (next == null) return;
    const trimmed = next.trim();
    if (trimmed.length < 2) {
      setError("שם חייב להיות לפחות 2 תווים");
      return;
    }
    const res = await fetch("/api/platform/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staff.id, displayName: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "עדכון שם נכשל");
      return;
    }
    setMessage(`שם עודכן ל־${trimmed}`);
    load();
  }

  async function toggleStaffActive(staff: StaffMember) {
    const res = await fetch("/api/platform/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staff.id, isActive: !staff.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "עדכון סטטוס נכשל");
      return;
    }
    setMessage(
      staff.isActive
        ? `הושבת: ${staff.displayName}${data.teamMode === false ? " — המספרה חזרה למצב ספר יחיד" : ""}`
        : `הופעל: ${staff.displayName}${data.teamMode ? " — מצב צוות פעיל" : ""}`,
    );
    load();
  }

  async function deleteStaff(staff: StaffMember) {
    if (
      !confirm(
        `למחוק את "${staff.displayName}" מהצוות?\nהמחיקה תתבצע רק אם אין תורים משויכים אליו.`,
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch("/api/platform/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staff.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "מחיקה נכשלה");
      return;
    }
    setMessage(
      `נמחק מהצוות: ${staff.displayName}${
        data.teamMode === false ? " — המספרה במצב ספר יחיד" : ""
      }`,
    );
    load();
  }

  return (
    <div className="shop-chrome mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm shop-muted">ניהול מערכת</p>
          <h1 className="font-display text-3xl text-[var(--cream)] sm:text-4xl">
            ספר בקליק
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/45"
          >
            לדף הבית
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/45"
          >
            יציאה
          </button>
        </div>
      </header>

      {message ? (
        <p className="mb-4 rounded-lg border border-[var(--olive)]/40 bg-[rgba(47,74,52,0.35)] px-3 py-2 text-sm text-[var(--olive-soft)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="surface-dark mb-6 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--cream)]">
          הוספת ספר חדש
        </h2>
        <form
          onSubmit={createBarber}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-[var(--cream)]">
            שם תצוגה
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
              placeholder="דני הספר"
            />
          </label>
          <label className="text-sm font-medium text-[var(--cream)]">
            כתובת (slug)
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
              placeholder="dani"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
          </label>
          <label className="text-sm font-medium text-[var(--cream)]">
            שם משתמש להתחברות
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-[var(--cream)]">
            סיסמה התחלתית
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            />
          </label>
          <button
            type="submit"
            className="btn-primary rounded-xl px-5 py-2.5 font-semibold sm:col-span-2 sm:w-fit"
          >
            יצירת ספר
          </button>
        </form>
      </section>

      <section className="surface-dark rounded-2xl p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--cream)]">ספרים</h2>
        {loading ? (
          <p className="text-[rgba(248,243,236,0.62)]">טוען...</p>
        ) : barbers.length === 0 ? (
          <p className="text-[rgba(248,243,236,0.62)]">עדיין אין ספרים</p>
        ) : (
          <div className="space-y-3">
            {barbers.map((b) => {
              const activeStaff = (b.staff || []).filter((s) => s.isActive);
              const teamMode = activeStaff.length >= 2;
              const expanded = expandedStaffFor === b.id;
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-white/12 bg-black/30 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--cream)]">
                        {b.displayName}{" "}
                        <span className="text-sm font-normal text-[rgba(248,243,236,0.55)]">
                          /{b.slug}
                        </span>
                        {b.logoMimeType || b.logoUrl ? (
                          <span className="mr-2 text-xs font-normal text-[var(--copper)]">
                            · יש לוגו
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-[rgba(248,243,236,0.62)]">
                        משתמש: {b.username} · תורים: {b._count.appointments} ·{" "}
                        {b.isActive ? "פעיל" : "מושבת"} · שפה:{" "}
                        {b.locale === "ar" ? "ערבית" : "עברית"} · SMS:{" "}
                        {b.smsPlanEnabled ? "מופעל" : "לא במנוי"}
                        {b.smsPlanEnabled
                          ? ` (${b.smsRemaining}/${b.smsQuota})`
                          : ""}{" "}
                        · ביטול לקוח:{" "}
                        {b.customerCancelEnabled ? "מופעל" : "כבוי"} · צוות:{" "}
                        {teamMode
                          ? `${activeStaff.length} ספרים פעילים`
                          : "ספר יחיד"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/${b.slug}`}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        יומן
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStaffFor(expanded ? null : b.id)
                        }
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        צוות
                      </button>
                      <button
                        type="button"
                        onClick={() => renameDisplayName(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        שם תצוגה
                      </button>
                      <label className="shop-chip cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium">
                        {b.logoMimeType || b.logoUrl ? "החלף לוגו" : "העלה לוגו"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            e.target.value = "";
                            void uploadLogo(b, file);
                          }}
                        />
                      </label>
                      {b.logoMimeType || b.logoUrl ? (
                        <button
                          type="button"
                          onClick={() => removeLogo(b)}
                          className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                        >
                          הסר לוגו
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => resetPassword(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        איפוס סיסמה
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLocale(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                        title="מחליף את שפת דף ההזמנה, ניהול הספר והודעות ה-SMS"
                      >
                        {b.locale === "ar" ? "שפה: ערבית" : "שפה: עברית"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSmsPlan(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        {b.smsPlanEnabled ? "ביטול SMS" : "הפעל SMS"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsQuota(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                        title="מכסה חודשית — מתאפסת בראשון לחודש"
                      >
                        מכסה חודשית
                      </button>
                      <button
                        type="button"
                        onClick={() => addSmsCredits(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                        title="תוספת ליתרה בחודש הנוכחי בלבד"
                      >
                        הוסף SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCustomerCancel(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                        disabled={!b.smsPlanEnabled && !b.customerCancelEnabled}
                        title={
                          !b.smsPlanEnabled && !b.customerCancelEnabled
                            ? "יש להפעיל SMS קודם"
                            : undefined
                        }
                      >
                        {b.customerCancelEnabled
                          ? "כבה ביטול תור"
                          : "הפעל ביטול תור"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(b)}
                        className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                      >
                        {b.isActive ? "השבתה" : "הפעלה"}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-3 rounded-lg border border-white/12 bg-black/35 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--cream)]">
                          צוות המספרה
                          {!teamMode ? (
                            <span className="mr-2 font-normal text-[rgba(248,243,236,0.55)]">
                              (צריך לפחות 2 ספרים פעילים למצב צוות)
                            </span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          onClick={() => addStaff(b)}
                          className="shop-chip rounded-lg px-3 py-1.5 text-sm font-medium"
                        >
                          הוסף ספר לצוות
                        </button>
                      </div>
                      {(b.staff || []).length === 0 ? (
                        <p className="text-sm text-[rgba(248,243,236,0.62)]">
                          אין ספרי צוות — המספרה פועלת כספר יחיד
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {b.staff.map((s) => (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/12 bg-black/30 px-3 py-2"
                            >
                              <p className="text-sm font-medium text-[var(--cream)]">
                                {s.displayName}{" "}
                                <span className="text-[rgba(248,243,236,0.55)]">
                                  · {s.isActive ? "פעיל" : "מושבת"}
                                </span>
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => renameStaff(s)}
                                  className="shop-chip rounded-lg px-2.5 py-1 text-xs font-medium"
                                >
                                  שם
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleStaffActive(s)}
                                  className="shop-chip rounded-lg px-2.5 py-1 text-xs font-medium"
                                >
                                  {s.isActive ? "השבתה" : "הפעלה"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteStaff(s)}
                                  className="rounded-lg border border-red-400/35 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-200"
                                >
                                  מחק
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
