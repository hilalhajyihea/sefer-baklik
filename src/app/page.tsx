import Image from "next/image";
import Link from "next/link";
import {
  SITE_ADMIN_EMAIL,
  SITE_ADMIN_PHONE,
  SITE_ADMIN_WHATSAPP,
  SITE_INSTAGRAM,
  SITE_SOCIAL_HANDLE,
  SITE_TIKTOK,
} from "@/lib/site";
import { BrandMark } from "@/components/BrandGraphics";

const baseFeatures = [
  "رابط خاص لحجز المواعيد من الهاتف",
  "جدول مواعيد عام — الزبون يختار التاريخ والساعة المتاحة",
  "لوحة إدارة للمواعيد، ساعات العمل وأيام العطلة",
  "إضافة مواعيد من لوحة الإدارة، بما فيها المواعيد الثابتة",
  "فريق صالون — عدة حلاقين في جدول واحد",
  "العربية والعبرية في صفحة الحجز والرسائل",
];

const smsFeatures = [
  "500 رسالة SMS شهريًا (كل رسالة للزبون تُحسب رسالة واحدة)",
  "رسالة SMS لتأكيد حجز الموعد",
  "رسالة SMS للتذكير قبل الموعد",
  "تنبيه للحلاق عند إلغاء الزبون للموعد",
  "تتجدد الباقة في اليوم الأول من كل شهر",
];

const customFeatures = [
  "عدد رسائل SMS حسب الحاجة",
  "تخصيصات لصالون كبير أو لفريق موسّع",
  "مرافقة في الإعداد والتشغيل",
];

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--copper)]"
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
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#25D366" />
      <path
        d="M12.04 5.2c-3.55 0-6.43 2.86-6.43 6.39 0 1.13.3 2.23.87 3.2L5.6 17.9l3.2-0.84a6.4 6.4 0 0 0 3.04.73h.01c3.55 0 6.43-2.86 6.43-6.39 0-3.53-2.88-6.39-6.24-6.39Zm3.74 9.2c-.16.44-.91.81-1.26.86-.32.05-.73.07-1.18-.07-.27-.08-.62-.2-1.07-.39-1.87-.81-3.09-2.69-3.18-2.81-.09-.12-.76-1.01-.76-1.92 0-.92.48-1.36.65-1.54.16-.17.42-.25.66-.25.08 0 .15 0 .21.01.19.01.29.02.41.32.16.38.53 1.3.58 1.4.05.1.08.21.01.33-.06.13-.09.21-.18.32-.09.11-.19.25-.27.33-.09.09-.18.19-.08.36.1.17.46.75.98 1.21.67.6 1.24.79 1.42.88.18.09.28.07.38-.04.1-.11.46-.53.58-.71.12-.18.24-.15.41-.09.17.06 1.07.5 1.25.59.18.09.3.14.35.21.05.08.05.44-.11.88Z"
        fill="white"
      />
    </svg>
  );
}

function InstagramIcon({
  className = "h-5 w-5",
  gradientId = "ig-bg",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="7" fill={`url(#${gradientId})`} />
      <rect
        x="5.4"
        y="5.4"
        width="13.2"
        height="13.2"
        rx="4.2"
        stroke="white"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.35" stroke="white" strokeWidth="1.7" />
      <circle cx="16.35" cy="7.65" r="1.05" fill="white" />
      <defs>
        <radialGradient
          id={gradientId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(6 22) rotate(-90) scale(24 18)"
        >
          <stop stopColor="#f58529" />
          <stop offset="0.35" stopColor="#dd2a7b" />
          <stop offset="0.7" stopColor="#8134af" />
          <stop offset="1" stopColor="#515bd4" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function TikTokIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#111111" />
      <path
        d="M14.2 6.2c.55 1.85 1.9 3.15 3.85 3.45v2.15c-1.22-.03-2.35-.4-3.35-1.05v4.7c0 2.55-2.05 4.55-4.7 4.55A4.58 4.58 0 0 1 5.5 15.4c0-2.55 2.05-4.55 4.5-4.55.28 0 .55.03.8.08v2.25a2.4 2.4 0 0 0-.8-.14 2.32 2.32 0 0 0-2.3 2.36c0 1.3 1.05 2.36 2.3 2.36 1.28 0 2.32-1.04 2.32-2.36V6.2h2.88Z"
        fill="#25F4EE"
      />
      <path
        d="M13.85 5.85c.55 1.85 1.9 3.15 3.85 3.45v2.15c-1.22-.03-2.35-.4-3.35-1.05v4.7c0 2.55-2.05 4.55-4.7 4.55A4.58 4.58 0 0 1 5.15 15.05c0-2.55 2.05-4.55 4.5-4.55.28 0 .55.03.8.08v2.25a2.4 2.4 0 0 0-.8-.14 2.32 2.32 0 0 0-2.3 2.36c0 1.3 1.05 2.36 2.3 2.36 1.28 0 2.32-1.04 2.32-2.36V5.85h2.88Z"
        fill="#FE2C55"
      />
      <path
        d="M13.55 6c.55 1.85 1.9 3.15 3.85 3.45v2.15c-1.22-.03-2.35-.4-3.35-1.05v4.7c0 2.55-2.05 4.55-4.7 4.55A4.58 4.58 0 0 1 4.85 15.2c0-2.55 2.05-4.55 4.5-4.55.28 0 .55.03.8.08v2.25a2.4 2.4 0 0 0-.8-.14 2.32 2.32 0 0 0-2.3 2.36c0 1.3 1.05 2.36 2.3 2.36 1.28 0 2.32-1.04 2.32-2.36V6h2.88Z"
        fill="white"
      />
    </svg>
  );
}

function SocialButtons({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const icon = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <div className="flex items-center gap-2.5">
      <a
        href={SITE_ADMIN_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className={`${box} overflow-hidden rounded-xl shadow-md transition hover:scale-105`}
        aria-label={`WhatsApp ${SITE_ADMIN_PHONE}`}
        title={`WhatsApp ${SITE_ADMIN_PHONE}`}
      >
        <WhatsAppIcon className={icon} />
      </a>
      <a
        href={SITE_INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        className={`${box} overflow-hidden rounded-xl shadow-md transition hover:scale-105`}
        aria-label={`Instagram @${SITE_SOCIAL_HANDLE}`}
        title={`Instagram @${SITE_SOCIAL_HANDLE}`}
      >
        <InstagramIcon className={icon} gradientId={`ig-bg-${size}`} />
      </a>
      <a
        href={SITE_TIKTOK}
        target="_blank"
        rel="noopener noreferrer"
        className={`${box} overflow-hidden rounded-xl shadow-md transition hover:scale-105`}
        aria-label={`TikTok @${SITE_SOCIAL_HANDLE}`}
        title={`TikTok @${SITE_SOCIAL_HANDLE}`}
      >
        <TikTokIcon className={icon} />
      </a>
    </div>
  );
}

export default function HomePage() {
  return (
    <main
      lang="ar"
      dir="rtl"
      className="shop-shell relative flex flex-1 flex-col"
    >
      <section className="relative isolate min-h-[88svh] overflow-hidden sm:min-h-[92svh]">
        <Image
          src="/images/barber-hero-default.jpg"
          alt="صالون حلاقة احترافي"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#0e0b09] via-[rgba(18,14,11,0.62)] to-[rgba(18,14,11,0.28)]"
        />
        <div
          aria-hidden
          className="barber-stripes absolute inset-y-0 right-0 w-2 opacity-90 sm:w-3"
        />

        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-6xl flex-col justify-between px-6 py-6 sm:min-h-[92svh] sm:px-10 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark tone="light" label="حلاق بكبسة زر" />
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <a
                href="#pricing"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                الأسعار
              </a>
              <a
                href="#contact"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                تواصل معنا
              </a>
              <Link
                href="/platform/login"
                className="rounded-xl border border-white/25 bg-black/25 px-4 py-2 text-[var(--cream)] backdrop-blur-sm transition hover:bg-black/40"
              >
                الإدارة
              </Link>
            </nav>
          </div>

          <header className="animate-fade-up max-w-2xl pb-16 pt-20 sm:pb-20 sm:pt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgba(248,243,236,0.78)] sm:text-sm">
              جدول مواعيد رقمي لصالونات الحلاقة
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[1.08] text-[var(--cream)] sm:text-7xl">
              حلاق بكبسة زر
            </h1>
            <div className="mt-5 h-1 w-24 rounded-full bg-[var(--copper)]" />
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[rgba(248,243,236,0.86)] sm:text-xl">
              رابط خاص لكل حلاق. الزبون يحجز موعده من الهاتف — بدون مكالمات
              وبدون انتظار. جدول سهل لإدارة المواعيد، رسائل SMS وتذكيرات
              للزبائن، وكل هذا ابتداءً من ₪99 شهريًا.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/dani"
                className="btn-primary inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-semibold"
              >
                مثال: جدول داني
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-[var(--cream)] backdrop-blur-sm transition hover:bg-white/20"
              >
                للأسعار الشهرية
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--copper)]">
            الأسعار
          </p>
          <h2 className="font-display mt-3 text-4xl text-[var(--cream)] sm:text-5xl">
            باقات شهرية
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[rgba(248,243,236,0.68)] sm:text-lg">
            السعر شهري. جميع الباقات تشمل أدوات الإدارة في التطبيق — والفرق
            بينها هو خدمة رسائل SMS.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="surface-dark flex flex-col rounded-2xl p-6 sm:p-7">
              <p className="text-sm font-semibold text-[rgba(248,243,236,0.62)]">
                الباقة الأساسية
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl text-[var(--cream)]">
                  ₪99
                </span>
                <span className="text-sm text-[rgba(248,243,236,0.55)]">
                  / شهريًا
                </span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(248,243,236,0.68)]">
                كل الميزات اللازمة لإدارة الصالون — بدون رسائل SMS للزبائن.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--cream)]">
                {baseFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 text-[rgba(248,243,236,0.55)]">
                  <span className="mt-0.5 inline-block w-4 shrink-0 text-center font-bold">
                    —
                  </span>
                  <span>بدون تأكيدات، تذكيرات أو تنبيهات عبر SMS</span>
                </li>
              </ul>
              <a
                href={SITE_ADMIN_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-[var(--cream)] transition hover:bg-white/10"
              >
                ابدأ عبر WhatsApp
              </a>
            </article>

            <article className="relative flex flex-col rounded-2xl border-2 border-[var(--copper)] bg-[rgba(22,18,14,0.96)] p-6 shadow-[0_22px_60px_rgba(196,90,40,0.22)] sm:p-7">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--copper)] px-3 py-1 text-xs font-bold text-white">
                الأكثر طلبًا
              </span>
              <p className="text-sm font-semibold text-[var(--copper)]">
                الباقة الموصى بها
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl text-[var(--cream)]">
                  ₪149
                </span>
                <span className="text-sm text-[rgba(248,243,236,0.55)]">
                  / شهريًا
                </span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(248,243,236,0.68)]">
                كل ما في الباقة الأساسية، بالإضافة إلى 500 رسالة SMS شهريًا
                للزبائن.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--cream)]">
                <li className="flex items-start gap-2.5 font-medium">
                  <CheckIcon />
                  <span>جميع ميزات الباقة الأساسية</span>
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
                اطلب الباقة عبر WhatsApp
              </a>
            </article>

            <article className="surface-dark flex flex-col rounded-2xl p-6 sm:p-7">
              <p className="text-sm font-semibold text-[rgba(248,243,236,0.62)]">
                باقة مخصّصة
              </p>
              <p className="mt-3 font-display text-4xl leading-tight text-[var(--cream)] sm:text-5xl">
                تواصل معنا
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(248,243,236,0.68)]">
                السعر حسب الحاجة — عدد مختلف من رسائل SMS، فريق كبير أو
                تخصيصات إضافية.
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-[var(--cream)]">
                <li className="flex items-start gap-2.5 font-medium">
                  <CheckIcon />
                  <span>جميع ميزات التطبيق</span>
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
                className="mt-8 inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-[var(--cream)] transition hover:bg-white/10"
              >
                احصل على عرض سعر
              </a>
            </article>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative scroll-mt-8 border-t border-white/10 px-6 py-14 sm:px-10"
      >
        <div className="barber-stripes-soft pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-[var(--cream)] sm:text-4xl">
              تواصل معنا
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[rgba(248,243,236,0.7)]">
              بدك موقع مثل هذا لصالونك؟ تواصل معنا عبر واتساب أو البريد
              الإلكتروني وسنساعدك على البدء.
            </p>
            <a
              href={`mailto:${SITE_ADMIN_EMAIL}`}
              className="mt-3 inline-block text-sm font-semibold text-[var(--copper)] underline-offset-2 hover:underline"
            >
              {SITE_ADMIN_EMAIL}
            </a>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <SocialButtons />
              <div className="text-sm leading-tight">
                <a
                  href={SITE_ADMIN_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-semibold text-[var(--cream)] underline-offset-2 hover:underline"
                >
                  {SITE_ADMIN_PHONE}
                </a>
                <span className="text-[rgba(248,243,236,0.62)]">
                  @{SITE_SOCIAL_HANDLE}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="relative mx-auto mt-10 max-w-6xl text-center text-sm text-[rgba(248,243,236,0.45)] sm:text-start">
          حلاق بكبسة زر · جدول مواعيد رقمي
        </p>
      </section>
    </main>
  );
}
