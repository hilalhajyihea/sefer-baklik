import { formatDateHe, formatTime } from "@/lib/time";

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

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export async function sendSms(toRaw: string, body: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
}> {
  if (!twilioConfigured()) {
    console.warn("[sms] Twilio not configured — skipping send");
    return { ok: true, skipped: true };
  }

  const to = normalizePhoneE164(toRaw);
  if (!to) {
    return { ok: false, error: "מספר טלפון לא תקין לשליחת SMS" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });

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

    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      console.error("[sms] Twilio error", data);
      return { ok: false, error: data.message || "שליחת SMS נכשלה" };
    }

    return { ok: true, sid: data.sid };
  } catch (error) {
    console.error("[sms] send failed", error);
    return { ok: false, error: "שגיאת רשת בשליחת SMS" };
  }
}

export function buildConfirmationSms(input: {
  customerName: string;
  barberName: string;
  startsAt: Date;
}): string {
  return [
    `שלום ${input.customerName},`,
    `התור אצל ${input.barberName} נקבע ל-${formatDateHe(input.startsAt)} בשעה ${formatTime(input.startsAt)}.`,
    "ספר בקליק",
  ].join("\n");
}

export function buildReminderSms(input: {
  customerName: string;
  barberName: string;
  startsAt: Date;
  minutesBefore: number;
}): string {
  return [
    `תזכורת: שלום ${input.customerName},`,
    `התור אצל ${input.barberName} בעוד כ-${input.minutesBefore} דקות (${formatTime(input.startsAt)}).`,
    "ספר בקליק",
  ].join("\n");
}
