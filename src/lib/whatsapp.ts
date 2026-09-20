import { normalizePhoneE164 } from "@/lib/sms";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export const WA_TEMPLATE_CONFIRM = "barbe_reg";
export const WA_TEMPLATE_REMINDER = "barber_notif_arabic";
export const WA_TEMPLATE_LANG = "ar";

function cleanEnv(value: string | undefined) {
  return (value || "").trim();
}

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
      reminder: WA_TEMPLATE_REMINDER,
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
      console.error("[whatsapp] send error", { to, message, data });
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
