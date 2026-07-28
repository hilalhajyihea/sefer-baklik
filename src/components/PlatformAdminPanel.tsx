"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Barber = {
  id: string;
  slug: string;
  displayName: string;
  username: string;
  isActive: boolean;
  slotMinutes: number;
  _count: { appointments: number };
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">ניהול מערכת</p>
          <h1 className="font-display text-3xl sm:text-4xl">ספר בקליק</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            לדף הבית
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

      <section className="surface mb-6 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">הוספת ספר חדש</h2>
        <form
          onSubmit={createBarber}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm font-medium">
            שם תצוגה
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
              placeholder="דני הספר"
            />
          </label>
          <label className="text-sm font-medium">
            כתובת (slug)
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
              placeholder="dani"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
          </label>
          <label className="text-sm font-medium">
            שם משתמש להתחברות
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            סיסמה התחלתית
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
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

      <section className="surface rounded-2xl p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">ספרים</h2>
        {loading ? (
          <p className="text-[var(--muted)]">טוען...</p>
        ) : barbers.length === 0 ? (
          <p className="text-[var(--muted)]">עדיין אין ספרים</p>
        ) : (
          <div className="space-y-3">
            {barbers.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {b.displayName}{" "}
                    <span className="text-sm font-normal text-[var(--muted)]">
                      /{b.slug}
                    </span>
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    משתמש: {b.username} · תורים: {b._count.appointments} ·{" "}
                    {b.isActive ? "פעיל" : "מושבת"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${b.slug}`}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium"
                  >
                    יומן
                  </Link>
                  <button
                    type="button"
                    onClick={() => resetPassword(b)}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium"
                  >
                    איפוס סיסמה
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium"
                  >
                    {b.isActive ? "השבתה" : "הפעלה"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
