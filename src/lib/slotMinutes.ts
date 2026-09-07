/** Allowed appointment lengths (minutes) for admin booking. */
export const ALLOWED_SLOT_MINUTES = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
] as const;

export type AllowedSlotMinutes = (typeof ALLOWED_SLOT_MINUTES)[number];

export function isAllowedSlotMinutes(value: number): value is AllowedSlotMinutes {
  return (ALLOWED_SLOT_MINUTES as readonly number[]).includes(value);
}

/** Resolve duration: whitelist only, else fallback (default shop length). */
export function resolveSlotMinutes(
  value: number | null | undefined,
  fallback = 30,
): number {
  if (typeof value === "number" && isAllowedSlotMinutes(value)) {
    return value;
  }
  if (isAllowedSlotMinutes(fallback)) return fallback;
  return 30;
}
