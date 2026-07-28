"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  endpoint: string;
  title: string;
  subtitle?: string;
  redirectTo: string;
};

export function LoginForm({ endpoint, title, subtitle, redirectTo }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ההתחברות נכשלה");
        return;
      }
      const dest =
        data.barber?.slug != null ? `/${data.barber.slug}/admin` : redirectTo;
      router.push(dest);
      router.refresh();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface w-full max-w-md rounded-2xl p-6 sm:p-8">
      <h1 className="font-display text-3xl text-[var(--ink)]">{title}</h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      ) : null}

      <label className="mt-6 block text-sm font-medium text-[var(--ink)]">
        שם משתמש
        <input
          className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--copper)]"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-[var(--ink)]">
        סיסמה
        <input
          type="password"
          className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--copper)]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary mt-6 w-full rounded-xl py-3 font-semibold"
      >
        {loading ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
