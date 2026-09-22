import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";
import { CONFIRM_HOLD_MINUTES } from "@/lib/appointmentStatus";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";
import { formatDateLocalized } from "@/lib/i18n";
import { formatTime } from "@/lib/time";
import { sendCustomerSms } from "@/lib/smsQuota";
import { sendCustomerWhatsApp } from "@/lib/whatsappQuota";
import {
  WA_TEMPLATE_LANG,
} from "@/lib/whatsapp";

export function generateConfirmToken() {
  return randomBytes(6).toString("base64url");
}

export function buildConfirmUrl(token: string) {
  return `${getSiteUrl()}/r/${token}`;
}

export function confirmExpiresAt(from = new Date()) {
  return new Date(from.getTime() + CONFIRM_HOLD_MINUTES * 60_000);
}

export function sanitizeConfirmToken(raw: string): string {
  let token = raw || "";
  try {
    token = decodeURIComponent(token);
  } catch {
    // keep raw
  }
  return token
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .trim();
}

export function buildConfirmRequestSms(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  startsAt: Date;
  confirmUrl: string;
  minutes: number;
  locale?: Locale | string | null;
}): string {
  const locale = normalizeLocale(input.locale);
  const where = input.staffName
    ? t(locale, "confirmRequestLine2Staff", {
        barber: input.barberName,
        staff: input.staffName,
        date: formatDateLocalized(locale, input.startsAt),
        time: formatTime(input.startsAt),
      })
    : t(locale, "confirmRequestLine2", {
        barber: input.barberName,
        date: formatDateLocalized(locale, input.startsAt),
        time: formatTime(input.startsAt),
      });
  return [
    t(locale, "confirmRequestLine1", { name: input.customerName }),
    where,
    t(locale, "confirmRequestLine3", { minutes: input.minutes }),
    t(locale, "confirmRequestLinkLabel"),
    input.confirmUrl,
    t(locale, "brand"),
  ].join("\n");
}

export const WA_TEMPLATE_CONFIRM_REQUEST = "barbe_confirm_request";

export function buildConfirmRequestWhatsAppParams(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  dateLabel: string;
  timeLabel: string;
  confirmUrl: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [
    input.customerName,
    salon,
    input.dateLabel,
    input.timeLabel,
    input.confirmUrl,
  ];
}

export async function findAppointmentByConfirmToken(rawToken: string) {
  const token = sanitizeConfirmToken(rawToken);
  if (!token || token.length < 6) return null;

  return prisma.appointment.findFirst({
    where: { confirmToken: token },
    include: {
      barber: {
        select: {
          displayName: true,
          slug: true,
          locale: true,
          isActive: true,
        },
      },
      staff: { select: { displayName: true } },
    },
  });
}

export type ConfirmPageState =
  | "confirm"
  | "success"
  | "already_confirmed"
  | "expired"
  | "cancelled"
  | "invalid";

export function resolveConfirmState(
  appointment: {
    status: string;
    confirmExpiresAt: Date | null;
  } | null,
): ConfirmPageState {
  if (!appointment) return "invalid";
  if (appointment.status === "BOOKED") return "already_confirmed";
  if (appointment.status === "CANCELLED") return "cancelled";
  if (appointment.status !== "PENDING_CONFIRM") return "invalid";
  if (
    appointment.confirmExpiresAt &&
    appointment.confirmExpiresAt.getTime() <= Date.now()
  ) {
    return "expired";
  }
  return "confirm";
}

/** Customer clicked confirm link — finalize booking. No extra SMS/WA. */
export async function confirmPendingAppointment(rawToken: string) {
  const appointment = await findAppointmentByConfirmToken(rawToken);
  const state = resolveConfirmState(appointment);
  if (!appointment) return { state: "invalid" as const, appointment: null };
  if (state === "already_confirmed") {
    return { state, appointment };
  }
  if (state !== "confirm") {
    return { state, appointment };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "BOOKED",
      confirmExpiresAt: null,
      confirmationSentAt: new Date(),
    },
    include: {
      barber: {
        select: {
          displayName: true,
          slug: true,
          locale: true,
          isActive: true,
        },
      },
      staff: { select: { displayName: true } },
    },
  });

  return { state: "success" as const, appointment: updated };
}

export async function sendBookingConfirmRequest(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      barber: true,
      staff: { select: { displayName: true } },
    },
  });
  if (!appointment || appointment.status !== "PENDING_CONFIRM") {
    return { ok: false, error: "תור לא ממתין לאישור" };
  }
  if (!appointment.confirmToken) {
    return { ok: false, error: "חסר קישור אישור" };
  }

  const phone = (appointment.customerPhone || "").trim();
  if (!phone) {
    return { ok: false, skipped: true, error: "אין טלפון ללקוח" };
  }

  const confirmUrl = buildConfirmUrl(appointment.confirmToken);
  const smsOn =
    appointment.barber.smsPlanEnabled &&
    appointment.barber.smsConfirmationEnabled;
  const waOn =
    appointment.barber.whatsappPlanEnabled &&
    appointment.barber.whatsappConfirmationEnabled;

  if (!smsOn && !waOn) {
    return {
      ok: false,
      error: "נדרש SMS או WhatsApp פעיל לשליחת קישור האישור",
    };
  }

  let sms;
  let whatsapp;

  if (smsOn) {
    sms = await sendCustomerSms({
      barberId: appointment.barberId,
      to: phone,
      body: buildConfirmRequestSms({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        startsAt: appointment.startsAt,
        confirmUrl,
        minutes: CONFIRM_HOLD_MINUTES,
        locale: appointment.barber.locale,
      }),
    });
  }

  if (waOn) {
    whatsapp = await sendCustomerWhatsApp({
      barberId: appointment.barberId,
      to: phone,
      templateName: WA_TEMPLATE_CONFIRM_REQUEST,
      languageCode: WA_TEMPLATE_LANG,
      bodyParams: buildConfirmRequestWhatsAppParams({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        dateLabel: formatDateLocalized("ar", appointment.startsAt),
        timeLabel: formatTime(appointment.startsAt),
        confirmUrl,
      }),
    });
  }

  const anyOk =
    Boolean(sms && sms.ok && !sms.skipped) ||
    Boolean(whatsapp && whatsapp.ok && !whatsapp.skipped);

  return {
    ok: anyOk,
    skipped: !anyOk,
    error: anyOk
      ? undefined
      : sms?.error || whatsapp?.error || "שליחת קישור האישור נכשלה",
    sms,
    whatsapp,
  };
}

/** Cancel PENDING_CONFIRM appointments past confirmExpiresAt. */
export async function expirePendingConfirmations() {
  const now = new Date();
  const result = await prisma.appointment.updateMany({
    where: {
      status: "PENDING_CONFIRM",
      confirmExpiresAt: { lte: now },
    },
    data: { status: "CANCELLED" },
  });
  return { expired: result.count };
}
