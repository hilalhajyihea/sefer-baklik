import { normalizePhoneE164 } from "@/lib/sms";

function cleanEnv(value: string | undefined) {
  return (value || "").trim();
}

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export const WA_TEMPLATE_CONFIRM = "barbe_reg";
export const WA_TEMPLATE_CONFIRM_NO_CANCEL = "barbe_reg_no_cancel";
export const WA_TEMPLATE_REMINDER = "barber_notif_arabic";
export const WA_TEMPLATE_REMINDER_NO_CANCEL = "barber_notif_arabic_no_cancel";
/** Barber alert when customer self-cancels (approved Meta template) */
export const WA_TEMPLATE_BARBER_CANCEL =
  cleanEnv(process.env.WHATSAPP_TEMPLATE_BARBER_CANCEL) || "barber_cancel_ar";
/** Must match the approved template language in Meta (often "ar") */
export const WA_TEMPLATE_LANG =
  cleanEnv(process.env.WHATSAPP_TEMPLATE_LANG) || "ar";

export function getWhatsAppConfig() {
  return {
    token: cleanEnv(process.env.WHATSAPP_TOKEN),
    phoneNumberId: cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID),
  };
}

export function whatsappConfigured() {
  const { token, phoneNumberId } = getWhatsAppConfig();
  return Boolean(token && phoneNumberId);
}

export function whatsappConfigStatus() {
  const { token, phoneNumberId } = getWhatsAppConfig();
  return {
    configured: Boolean(token && phoneNumberId),
    hasToken: Boolean(token),
    hasPhoneNumberId: Boolean(phoneNumberId),
    graphVersion: GRAPH_VERSION,
    templates: {
      confirm: WA_TEMPLATE_CONFIRM,
      confirmNoCancel: WA_TEMPLATE_CONFIRM_NO_CANCEL,
      reminder: WA_TEMPLATE_REMINDER,
      reminderNoCancel: WA_TEMPLATE_REMINDER_NO_CANCEL,
      barberCancel: WA_TEMPLATE_BARBER_CANCEL,
      language: WA_TEMPLATE_LANG,
    },
  };
}

/** Meta expects digits only, country code, no +. */
export function normalizePhoneWhatsApp(raw: string): string | null {
  const e164 = normalizePhoneE164(raw);
  if (!e164) return null;
  return e164.replace(/\D/g, "");
}

function bodyTextParams(values: string[]) {
  return values.map((text) => ({
    type: "text" as const,
    text: text.trim() || "-",
  }));
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams: string[];
}): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
}> {
  const { token, phoneNumberId } = getWhatsAppConfig();
  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] not configured — skipping send");
    return {
      ok: false,
      skipped: true,
      error: "WhatsApp אינו מוגדר בשרת",
    };
  }

  const to = normalizePhoneWhatsApp(input.to);
  if (!to) {
    return { ok: false, error: "טלפון לא תקין ל-WhatsApp", to: input.to };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode || WA_TEMPLATE_LANG },
          components: [
            {
              type: "body",
              parameters: bodyTextParams(input.bodyParams),
            },
          ],
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string; error_user_msg?: string };
    };

    if (!res.ok) {
      const message =
        data.error?.error_user_msg ||
        data.error?.message ||
        `HTTP ${res.status}`;
      console.error("[whatsapp] send error", {
        to,
        template: input.templateName,
        language: input.languageCode || WA_TEMPLATE_LANG,
        message,
        data,
      });
      return { ok: false, error: message, to };
    }

    const sid = data.messages?.[0]?.id;
    console.info("[whatsapp] sent", { to, template: input.templateName, sid });
    return { ok: true, sid, to };
  } catch (error) {
    console.error("[whatsapp] send failed", error);
    return { ok: false, error: "שגיאת רשת בשליחת WhatsApp", to };
  }
}

export function buildConfirmWhatsAppParams(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  dateLabel: string;
  timeLabel: string;
  cancelUrl: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [
    input.customerName,
    salon,
    input.dateLabel,
    input.timeLabel,
    input.cancelUrl,
  ];
}

/** barbe_reg_no_cancel: {{1}} name, {{2}} salon, {{3}} date, {{4}} time */
export function buildConfirmWhatsAppParamsNoCancel(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  dateLabel: string;
  timeLabel: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [input.customerName, salon, input.dateLabel, input.timeLabel];
}

export function buildReminderWhatsAppParams(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  minutesBefore: number;
  timeLabel: string;
  cancelUrl: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [
    input.customerName,
    salon,
    String(input.minutesBefore),
    input.timeLabel,
    input.cancelUrl,
  ];
}

/** barber_notif_arabic_no_cancel: {{1}} name, {{2}} salon, {{3}} minutes, {{4}} time */
export function buildReminderWhatsAppParamsNoCancel(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  minutesBefore: number;
  timeLabel: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [
    input.customerName,
    salon,
    String(input.minutesBefore),
    input.timeLabel,
  ];
}

/** Params for barber_cancel_ar: {{1}} name, {{2}} date, {{3}} time */
export function buildBarberCancelWhatsAppParams(input: {
  customerName: string;
  staffName?: string | null;
  dateLabel: string;
  timeLabel: string;
}) {
  const name = input.staffName
    ? `${input.customerName} (لدى ${input.staffName})`
    : input.customerName;
  return [name, input.dateLabel, input.timeLabel];
}
