/** Decorative scissors mark for brand atmosphere */
export function ScissorsMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="42" cy="42" r="22" stroke="currentColor" strokeWidth="5" />
      <circle cx="42" cy="118" r="22" stroke="currentColor" strokeWidth="5" />
      <path
        d="M58 52 L128 28 L136 44 L66 68 Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M58 108 L128 132 L136 116 L66 92 Z"
        fill="currentColor"
        opacity="0.92"
      />
      <circle cx="62" cy="80" r="7" fill="currentColor" />
      <path
        d="M70 80 H118"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Shared bilingual logo mark — no letters.
 * Scissors + click cursor hint for online booking.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Soft plate */}
      <circle cx="32" cy="32" r="30" fill="#1c1713" />
      <circle
        cx="32"
        cy="32"
        r="28.5"
        stroke="#c45a28"
        strokeWidth="1.5"
        opacity="0.55"
      />

      {/* Barber-pole accent arc */}
      <path
        d="M14 40c4 10 14 16 26 14"
        stroke="#c45a28"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Scissors — handles */}
      <circle
        cx="22"
        cy="20"
        r="6.5"
        stroke="#f8f3ec"
        strokeWidth="2.4"
      />
      <circle
        cx="22"
        cy="44"
        r="6.5"
        stroke="#f8f3ec"
        strokeWidth="2.4"
      />

      {/* Scissors — blades */}
      <path
        d="M27.5 24.5 L46 16.5 L48.5 21.5 L30 29.5 Z"
        fill="#f8f3ec"
      />
      <path
        d="M27.5 39.5 L46 47.5 L48.5 42.5 L30 34.5 Z"
        fill="#f8f3ec"
      />

      {/* Pivot */}
      <circle cx="29" cy="32" r="3.2" fill="#c45a28" />
      <circle cx="29" cy="32" r="1.4" fill="#f8f3ec" />

      {/* Click cursor */}
      <path
        d="M40 28 L40 46 L44.2 42.2 L46.8 48.2 L50.2 46.6 L47.6 40.6 L53 40.6 Z"
        fill="#c45a28"
        stroke="#1c1713"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Click ripple */}
      <circle
        cx="50.5"
        cy="36.5"
        r="5"
        stroke="#d5e4d2"
        strokeWidth="1.6"
        opacity="0.85"
      />
      <circle
        cx="50.5"
        cy="36.5"
        r="2.2"
        fill="#2f4a34"
        opacity="0.9"
      />
    </svg>
  );
}

type BrandMarkProps = {
  className?: string;
  tone?: "dark" | "light";
  label?: string;
  /** @deprecated Logo is shared; initials are ignored */
  initials?: string;
};

export function BrandMark({
  className = "",
  tone = "dark",
  label = "ספר בקליק",
}: BrandMarkProps) {
  const text =
    tone === "light" ? "text-[var(--cream)]" : "text-[var(--ink)]";
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-10 w-10 shrink-0 drop-shadow-md" />
      <span className={`font-display text-xl leading-none ${text}`}>
        {label}
      </span>
    </div>
  );
}
