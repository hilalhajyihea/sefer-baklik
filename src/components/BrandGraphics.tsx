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

type BrandMarkProps = {
  className?: string;
  tone?: "dark" | "light";
};

export function BrandMark({ className = "", tone = "dark" }: BrandMarkProps) {
  const text =
    tone === "light" ? "text-[var(--cream)]" : "text-[var(--ink)]";
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md">
        <span className="barber-stripes absolute inset-0" />
        <span className="relative text-[11px] font-bold tracking-tight text-white drop-shadow-sm">
          סב
        </span>
      </span>
      <span className={`font-display text-xl leading-none ${text}`}>
        ספר בקליק
      </span>
    </div>
  );
}
