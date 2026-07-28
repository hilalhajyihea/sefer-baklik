import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b65c2c' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <section className="relative mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="animate-fade-up mb-4 text-sm font-medium tracking-[0.2em] text-[var(--muted)]">
          יומן תורים לספרים
        </p>
        <h1 className="font-display animate-fade-up text-5xl leading-tight text-[var(--ink)] sm:text-7xl">
          ספר בקליק
        </h1>
        <p
          className="animate-fade-up mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]"
          style={{ animationDelay: "80ms" }}
        >
          כל ספר מקבל כתובת ייחודית. הלקוחות נכנסים וקובעים תור ישירות מהטלפון
          או מהמחשב — בלי שיחות ובלי המתנה.
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-wrap gap-3"
          style={{ animationDelay: "140ms" }}
        >
          <Link
            href="/dani"
            className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold"
          >
            דוגמה: יומן של דני
          </Link>
          <Link
            href="/platform/login"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white/70 px-6 py-3 text-base font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            כניסת מנהל מערכת
          </Link>
        </div>

        <div
          className="animate-soft-pulse mt-16 h-px w-24 bg-[var(--copper)]"
          style={{ animationDelay: "200ms" }}
        />
      </section>
    </main>
  );
}
