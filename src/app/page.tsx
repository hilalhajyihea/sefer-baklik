import Image from "next/image";
import Link from "next/link";
import {
  SITE_ADMIN_NAME,
  SITE_ADMIN_PHONE,
  SITE_ADMIN_WHATSAPP,
} from "@/lib/site";
import { BrandMark } from "@/components/BrandGraphics";

const baseFeatures = [
  "כתובת ייחודית לקביעת תור מהטלפון",
  "יומן ציבורי — הלקוח בוחר תאריך ושעה פנויה",
  "מסך ניהול: תורים, שעות פעילות וימי חופש",
  "קביעת תור מהניהול, כולל תורים קבועים",
  "צוות מספרה — כמה ספרים ביומן אחד",
  "עברית וערבית לדף ההזמנה ולהודעות",
];

const smsFeatures = [
  "500 הודעות SMS בחודש (כל הודעה ללקוח נספרת כ־1)",
  "SMS אישור אחרי קביעת תור",
  "SMS תזכורת לפני התור",
  "התראה לספר כשלקוח מבטל",
  "המכסה מתאפסת בראשון לכל חודש",
];

const customFeatures = [
  "מכסת SMS אחרת לפי הצורך",
  "התאמות למספרה גדולה או לצוות רחב",
  "ליווי בהקמה ובתפעול",
];

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--olive)]"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.5 10.5 8 14l7.5-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.38-1.41a10.1 10.1 0 0 0 4.66 1.12h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.76 14.16c-.24.67-1.4 1.24-1.94 1.32-.5.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.17-1.55-1.17-2.96 0-1.4.74-2.09 1-2.37.24-.26.64-.38 1.02-.38.12 0 .23 0 .33.01.29.01.44.03.63.49.24.58.82 2 .89 2.15.07.15.12.32.02.51-.09.2-.14.32-.28.5-.14.17-.29.38-.42.51-.14.14-.28.29-.12.56.16.26.7 1.15 1.5 1.86 1.03.92 1.9 1.21 2.18 1.35.27.13.43.11.59-.07.16-.17.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.35Z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      <section className="relative isolate min-h-[88svh] overflow-hidden sm:min-h-[92svh]">
        <Image
          src="/images/barber-hero-default.jpg"
          alt="מספרה מקצועית"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[rgba(20,16,12,0.94)] via-[rgba(20,16,12,0.62)] to-[rgba(20,16,12,0.38)]"
        />
        <div
          aria-hidden
          className="barber-stripes absolute inset-y-0 right-0 w-2 opacity-90 sm:w-3"
        />

        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-6xl flex-col justify-between px-6 py-6 sm:min-h-[92svh] sm:px-10 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark tone="light" />
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <a
                href="#pricing"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                מחירון
              </a>
              <a
                href="#contact"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                יצירת קשר
              </a>
            </nav>
          </div>

          <header className="animate-fade-up max-w-2xl pb-16 pt-20 sm:pb-20 sm:pt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgba(248,243,236,0.78)] sm:text-sm">
              יומן תורים דיגיטלי למספרות
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[1.08] text-[var(--cream)] sm:text-7xl">
              ספר בקליק
            </h1>
            <div className="mt-5 h-1 w-24 rounded-full bg-[var(--copper)]" />
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[rgba(248,243,236,0.86)] sm:text-xl">
              כתובת ייחודית לכל ספר. הלקוח נכנס וקובע תור מהטלפון — בלי שיחות
              ובלי המתנה.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/dani"
                className="btn-primary inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold"
              >
                דוגמה: יומן של דני
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-white/20"
              >
                למחירון החודשי
              </a>
            </div>
          </header>
        </div>
      </section>

      <section
        id="pricing"
        className="relative scroll-mt-8 px-6 py-16 sm:px-10 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper-deep)]">
            מחירון
          </p>
          <h2 className="font-display mt-3 text-4xl text-[var(--ink)] sm:text-5xl">
            חבילות חודשיות
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            המחיר הוא לחודש. כל החבילות כוללות את כלי הניהול באפליקציה —
            ההבדל הוא בשירות ה-SMS.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="surface flex flex-col rounded-2xl p-6 sm:p-7">
              <p className="text-sm font-semibold text-[var(--muted)]">
                חבילת בסיס
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl text-[var(--ink)]">
                  ₪99
                </span>
                <span className="text-sm text-[var(--muted)]">/ לחודש</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                כל הפיצ׳רים לניהול המספרה — בלי הודעות SMS ללקוחות.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--ink)]">
                {baseFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 text-[var(--muted)]">
                  <span className="mt-0.5 inline-block w-4 shrink-0 text-center font-bold">
                    —
                  </span>
                  <span>ללא אישור, תזכורת או התראות ב-SMS</span>
                </li>
              </ul>
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-xl border border-[var(--ink)]/15 px-5 py-3 text-sm font-semibold transition hover:bg-white"
              >
                להתחיל ב-WhatsApp
              </a>
            </article>

            <article className="relative flex flex-col rounded-2xl border-2 border-[var(--copper)] bg-[var(--cream)] p-6 shadow-[0_22px_60px_rgba(196,90,40,0.16)] sm:p-7">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--copper)] px-3 py-1 text-xs font-bold text-white">
                מומלץ
              </span>
              <p className="text-sm font-semibold text-[var(--copper-deep)]">
                חבילה מומלצת
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl text-[var(--ink)]">
                  ₪149
                </span>
                <span className="text-sm text-[var(--muted)]">/ לחודש</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                כל מה שיש בבסיס, ועוד 500 הודעות SMS בחודש ללקוחות.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--ink)]">
                <li className="flex items-start gap-2.5 font-medium">
                  <CheckIcon />
                  <span>כל פיצ׳רי חבילת הבסיס</span>
                </li>
                {smsFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
              >
                לשדרג ב-WhatsApp
              </a>
            </article>

            <article className="surface flex flex-col rounded-2xl p-6 sm:p-7">
              <p className="text-sm font-semibold text-[var(--muted)]">
                חבילה מותאמת אישית
              </p>
              <p className="mt-3 font-display text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
                צור קשר
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                מחיר לפי צורך — מכסת SMS אחרת, צוות גדול או התאמות נוספות.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--ink)]">
                <li className="flex items-start gap-2.5 font-medium">
                  <CheckIcon />
                  <span>כל פיצ׳רי האפליקציה</span>
                </li>
                {customFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-xl border border-[var(--ink)]/15 px-5 py-3 text-sm font-semibold transition hover:bg-white"
              >
                לקבל הצעת מחיר
              </a>
            </article>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative scroll-mt-8 border-t border-[var(--line)] bg-[var(--charcoal)] px-6 py-14 sm:px-10"
      >
        <div className="barber-stripes-soft pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper)]">
              יצירת קשר
            </p>
            <h2 className="font-display mt-3 text-3xl text-[var(--cream)] sm:text-4xl">
              {SITE_ADMIN_NAME}
            </h2>
            <p className="mt-2 text-[rgba(248,243,236,0.72)]">מנהל האתר</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[rgba(248,243,236,0.7)]">
              רוצה את זה אצלך במספרה? כתבו בוואטסאפ ונחבר אתכם.
            </p>
          </div>
          <a
            href={SITE_ADMIN_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            <WhatsAppIcon className="h-6 w-6" />
            WhatsApp {SITE_ADMIN_PHONE}
          </a>
        </div>
        <p className="relative mx-auto mt-10 max-w-6xl text-center text-sm text-[var(--stripe)] sm:text-start">
          ספר בקליק · יומן תורים דיגיטלי
        </p>
      </section>

      <a
        href={SITE_ADMIN_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 left-5 z-50 flex max-w-[16.5rem] items-center gap-3 rounded-2xl bg-[#25D366] px-3.5 py-3 text-white shadow-[0_12px_32px_rgba(37,211,102,0.38)] transition hover:brightness-110"
        aria-label={`WhatsApp ${SITE_ADMIN_NAME}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <WhatsAppIcon className="h-6 w-6" />
        </span>
        <span className="min-w-0 text-start leading-tight">
          <span className="block text-[11px] font-medium text-white/85">
            מנהל האתר
          </span>
          <span className="block truncate text-sm font-bold">
            {SITE_ADMIN_NAME}
          </span>
          <span className="block text-xs font-semibold tracking-wide">
            {SITE_ADMIN_PHONE}
          </span>
        </span>
      </a>
    </main>
  );
}
