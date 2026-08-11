import Link from "next/link";
import { SITE_ADMIN_NAME, SITE_ADMIN_PHONE } from "@/lib/site";
import { LogoMark, ScissorsMark } from "@/components/BrandGraphics";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Full-bleed hero composition */}
      <section className="relative min-h-[100svh] overflow-hidden">
        {/* Dominant graphic plane */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-y-0 left-0 w-[42%] max-lg:hidden">
            <div className="barber-stripes animate-stripe absolute inset-0 opacity-[0.18]" />
            <div className="absolute inset-0 bg-gradient-to-l from-[var(--cream)] via-transparent to-transparent" />
          </div>
          <div className="grain absolute inset-0" />
          <div className="absolute -left-8 bottom-[12%] top-[18%] w-3 max-sm:hidden">
            <div className="barber-stripes h-full w-full rounded-full opacity-80 shadow-lg" />
          </div>
          <ScissorsMark className="animate-drift absolute left-[6%] top-[22%] h-36 w-36 text-[var(--copper)] opacity-[0.14] max-lg:left-auto max-lg:right-[4%] max-lg:top-[8%] max-lg:h-28 max-lg:w-28" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 py-20 sm:px-10">
          <p
            className="animate-fade-up mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--copper-deep)] sm:text-sm"
          >
            יומן תורים דיגיטלי
          </p>

          <h1 className="font-display animate-fade-up flex max-w-3xl flex-wrap items-center gap-4 text-6xl leading-[1.05] text-[var(--ink)] sm:gap-5 sm:text-8xl">
            <LogoMark className="h-14 w-14 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]" />
            ספר בקליק
          </h1>

          <div
            className="animate-draw-line mt-6 h-1 w-28 rounded-full bg-[var(--copper)]"
            aria-hidden
          />

          <p
            className="animate-fade-up mt-7 max-w-lg text-lg leading-relaxed text-[var(--muted)] sm:text-xl"
            style={{ animationDelay: "100ms" }}
          >
            כתובת ייחודית לכל ספר. הלקוח נכנס וקובע תור מהטלפון — בלי שיחות
            ובלי המתנה.
          </p>

          <div
            className="animate-fade-up mt-11 flex flex-wrap gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/dani"
              className="btn-primary inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold"
            >
              דוגמה: יומן של דני
            </Link>
            <Link
              href="/platform/login"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--ink)]/15 bg-[var(--charcoal)] px-7 py-3.5 text-base font-semibold text-[var(--cream)] transition hover:bg-[var(--ink)]"
            >
              כניסת מנהל מערכת
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-[var(--line)] bg-[var(--charcoal)] px-6 py-8 text-center text-sm text-[var(--stripe)]">
        <div className="barber-stripes-soft pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <p>
            מנהל האתר: {SITE_ADMIN_NAME}{" "}
            <a
              href={`tel:${SITE_ADMIN_PHONE}`}
              className="font-medium text-[var(--copper)] underline-offset-2 hover:underline"
            >
              {SITE_ADMIN_PHONE}
            </a>
          </p>
          <p className="mt-2">
            רוצה את זה אצלך?{" "}
            <a
              href={`tel:${SITE_ADMIN_PHONE}`}
              className="font-semibold text-[var(--cream)] underline-offset-2 hover:underline"
            >
              צור קשר
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
