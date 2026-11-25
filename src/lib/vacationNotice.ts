import { dbDateToDateKey, toDateKey } from "@/lib/time";

export const VACATION_NOTICE_MAX_LEN = 500;

/** True when the public banner should show for today's Jerusalem date. */
export function resolveVacationNotice(input: {
  text: string | null | undefined;
  showFrom: Date | null | undefined;
  until: Date | null | undefined;
  todayKey?: string;
}): { active: true; text: string } | { active: false; text?: undefined } {
  const text = (input.text || "").trim();
  if (!text || !input.showFrom || !input.until) {
    return { active: false };
  }
  const today = input.todayKey ?? toDateKey();
  const from = dbDateToDateKey(input.showFrom);
  const until = dbDateToDateKey(input.until);
  if (today < from || today > until) {
    return { active: false };
  }
  return { active: true, text };
}
