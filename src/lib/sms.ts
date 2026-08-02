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

function cleanEnv(value: string | undefined) {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

function getTwilioConfig() {
  return {
    accountSid: cleanEnv(process.env.TWILIO_ACCOUNT_SID),
    authToken: cleanEnv(process.env.TWILIO_AUTH_TOKEN),
    from: cleanEnv(process.env.TWILIO_FROM_NUMBER),
  };
}

export function twilioConfigured() {
  const { accountSid, authToken, from } = getTwilioConfig();
  return Boolean(accountSid && authToken && from);
}

export function twilioConfigStatus() {
  const { accountSid, authToken, from } = getTwilioConfig();
  return {
    hasAccountSid: Boolean(accountSid),
    hasAuthToken: Boolean(authToken),
    hasFromNumber: Boolean(from),
    fromNumberPreview: from ? `${from.slice(0, 4)}…${from.slice(-4)}` : null,
    configured: Boolean(accountSid && authToken && from),
  };
}

export async function sendSms(
  toRaw: string,
  body: string,
  options?: { trialTemplate?: string },
): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
}> {
  const { accountSid, authToken, from } = getTwilioConfig();

  if (!accountSid || !authToken || !from) {
    console.warn("[sms] Twilio not configured — skipping send", {
      hasAccountSid: Boolean(accountSid),
      hasAuthToken: Boolean(authToken),
      hasFromNumber: Boolean(from),
    });
    return {
      ok: false,
      skipped: true,
      error: "Twilio לא מוגדר בשרת (חסר SID/Token/From)",
    };
  }

  const to = normalizePhoneE164(toRaw);
  if (!to) {
    return { ok: false, error: "מספר טלפון לא תקין לשליחת SMS" };
  }

  // Trial accounts may only send predefined template IDs as Body.
  // Set TWILIO_TRIAL_TEMPLATES=false after upgrading for custom Hebrew text.
  const useTrialTemplates = process.env.TWILIO_TRIAL_TEMPLATES !== "false";
  const messageBody = useTrialTemplates
    ? options?.trialTemplate || "sms_appointment_reminders"
    : body;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: messageBody,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = (await res.json()) as {
      sid?: string;
      message?: string;
      code?: number;
      status?: string;
    };
    if (!res.ok) {
      console.error("[sms] Twilio error", { to, from, messageBody, data });
      return {
        ok: false,
        error: data.message || `שליחת SMS נכשלה (קוד ${data.code || res.status})`,
        to,
      };
    }

    console.info("[sms] sent", {
      to,
      from,
      sid: data.sid,
      status: data.status,
      trial: useTrialTemplates,
    });
    return { ok: true, sid: data.sid, to };
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
