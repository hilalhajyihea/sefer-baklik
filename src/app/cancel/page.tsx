import Link from "next/link";

export const metadata = {
  title: "ביטול תור",
  robots: { index: false, follow: false },
};

/** Shown when the SMS link was truncated and opened without a token. */
export default function CancelMissingTokenPage() {
  return (
    <main className="relative flex flex-1 flex-col px-6 py-16 sm:py-24">
      <div className="relative mx-auto w-full max-w-md text-center">
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper-deep)]">
          ספר בקליק
        </p>
        <div className="surface rounded-2xl px-6 py-8">
          <h1 className="font-display text-3xl text-[var(--ink)]">
            קישור הביטול לא שלם
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
            נפתח קישור בלי מזהה תור. נסו לפתוח שוב את הקישור המלא מההודעה
            (לחיצה ארוכה על הכתובת והעתקה), או פנו לספר לביטול.
          </p>
          <Link
            href="/"
            className="btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            חזרה לספר בקליק
          </Link>
        </div>
      </div>
    </main>
  );
}
