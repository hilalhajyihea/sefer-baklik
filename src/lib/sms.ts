import { formatDateHe, formatTime } from "@/lib/time";
import { formatCancelSmsLine } from "@/lib/cancel";

/** Normalize Israeli / international phones to E.164 (+972...). */
export function normalizePhoneE164(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    digits = "+" + digits.slice(1).replace(/\D/g, "");
  } else {
    digits = digits.replace(/\D/g, "");
  }

  if (digits.startsWith("+972")) {
    const rest = digits.slice(4);
    if (rest.length < 8 || rest.length > 10) return null;
    return `+972${rest.replace(/^0+/, "")}`;
  }

  if (digits.startsWith("972")) {
    const rest = digits.slice(3).replace(/^0+/, "");
    if (rest.length < 8 || rest.length > 9) return null;
    return `+972${rest}`;
  }

  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (rest.length < 8 || rest.length > 9) return null;
    return `+972${rest}`;
  }

  // Already without leading 0, assume IL mobile (5xxxxxxxx)
  if (/^5\d{8}$/.test(digits)) {
    return `+972${digits}`;
  }

  return null;
}

/** 019 expects 05xxxxxxxx or 5xxxxxxxx (not +972). */
export function normalizePhoneIlLocal(raw: string): string | null {
  const e164 = normalizePhoneE164(raw);
  if (!e164 || !e164.startsWith("+972")) return null;
  const national = e164.slice(4);
  if (!national) return null;
  return `0${national}`;
}

function cleanEnv(value: string | undefined) {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

function getSms019Config() {
  return {
    username: cleanEnv(process.env.SMS_019_USERNAME),
    token: cleanEnv(process.env.SMS_019_TOKEN),
    source: cleanEnv(process.env.SMS_019_SOURCE),
  };
}

export function sms019Configured() {
  const { username, token, source } = getSms019Config();
  return Boolean(username && token && source);
}

/** Safe status check — does not expose secrets. */
export function sms019ConfigStatus() {
  const { username, token, source } = getSms019Config();
  return {
    provider: "019",
    hasUsername: Boolean(username),
    hasToken: Boolean(token),
    hasSource: Boolean(source),
    usernamePreview: username || null,
    sourcePreview: source || null,
    configured: Boolean(username && token && source),
  };
}

/** @deprecated use sms019Configured */
export const twilioConfigured = sms019Configured;
/** @deprecated use sms019ConfigStatus */
export const twilioConfigStatus = sms019ConfigStatus;

function parse019Status(data: unknown): { status: number | null; message: string } {
  if (!data || typeof data !== "object") {
    return { status: null, message: "" };
  }
  const root = data as Record<string, unknown>;
  const nested =
    root.sms && typeof root.sms === "object"
      ? (root.sms as Record<string, unknown>)
      : root;
  const raw = nested.status ?? root.status;
  const status =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))
        ? Number(raw)
        : null;
  const message = String(nested.message ?? root.message ?? "");
  return { status, message };
}

export async function sendSms(
  toRaw: string,
  body: string,
): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
}> {
  const { username, token, source } = getSms019Config();

  if (!username || !token || !source) {
    console.warn("[sms] 019 not configured — skipping send", {
      hasUsername: Boolean(username),
      hasToken: Boolean(token),
      hasSource: Boolean(source),
    });
    return {
      ok: false,
      skipped: true,
      error: "019 SMS לא מוגדר בשרת (חסר USERNAME/TOKEN/SOURCE)",
    };
  }

  const to = normalizePhoneIlLocal(toRaw);
  if (!to) {
    return { ok: false, error: "מספר טלפון לא תקין לשליחת SMS" };
  }

  const payload = {
    sms: {
      user: { username },
      source,
      destinations: { phone: to },
      message: body,
    },
  };

  try {
    const res = await fetch("https://019sms.co.il/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    const { status, message } = parse019Status(data);

    if (!res.ok || (status !== null && status !== 0)) {
      console.error("[sms] 019 error", { to, source, status, message, data });
      return {
        ok: false,
        error:
          message ||
          `שליחת SMS נכשלה (019 status ${status ?? res.status})`,
        to,
      };
    }

    const sid =
      data && typeof data === "object"
        ? String(
            (data as Record<string, unknown>).shipment_id ??
              (data as Record<string, unknown>).id ??
              "",
          ) || undefined
        : undefined;

    console.info("[sms] sent via 019", { to, source, status, sid });
    return { ok: true, sid, to };
  } catch (error) {
    console.error("[sms] send failed", error);
    return { ok: false, error: "שגיאת רשת בשליחת SMS", to };
  }
}

export function buildConfirmationSms(input: {
  customerName: string;
  barberName: string;
  startsAt: Date;
  cancelUrl?: string | null;
}): string {
  const lines = [
    `שלום ${input.customerName},`,
    `התור אצל ${input.barberName} נקבע ל-${formatDateHe(input.startsAt)} בשעה ${formatTime(input.startsAt)}.`,
    "ספר בקליק",
  ];
  if (input.cancelUrl) {
    lines.push(formatCancelSmsLine(input.cancelUrl));
  }
  return lines.join("\n");
}

export function buildReminderSms(input: {
  customerName: string;
  barberName: string;
  startsAt: Date;
  minutesBefore: number;
  cancelUrl?: string | null;
}): string {
  const lines = [
    `תזכורת: שלום ${input.customerName},`,
    `התור אצל ${input.barberName} בעוד כ-${input.minutesBefore} דקות (${formatTime(input.startsAt)}).`,
    "ספר בקליק",
  ];
  if (input.cancelUrl) {
    lines.push(formatCancelSmsLine(input.cancelUrl));
  }
  return lines.join("\n");
}
