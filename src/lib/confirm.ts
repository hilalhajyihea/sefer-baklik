import { randomBytes, randomInt } from "crypto";
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

/** Utility OTP template barbe_confirm_code — Approved in Meta. */
export const WA_CONFIRM_CODE_ENABLED = true;
/** Meta Utility template: {{1}} name, {{2}} salon, {{3}} code */
export const WA_TEMPLATE_CONFIRM_CODE = "barbe_confirm_code";

export function generateConfirmToken() {
  return randomBytes(6).toString("base64url");
}

/** 6-digit numeric OTP for bookingRequiresConfirmCode. */
export function generateConfirmCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function sanitizeConfirmCode(raw: string): string {
  return (raw || "").replace(/\D/g, "").slice(0, 8);
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

export function buildConfirmCodeSms(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  code: string;
  minutes: number;
  locale?: Locale | string | null;
}): string {
  const locale = normalizeLocale(input.locale);
  const where = input.staffName
    ? t(locale, "confirmCodeSmsLine2Staff", {
        barber: input.barberName,
        staff: input.staffName,
        code: input.code,
      })
    : t(locale, "confirmCodeSmsLine2", {
        barber: input.barberName,
        code: input.code,
      });
  return [
    t(locale, "confirmCodeSmsLine1", { name: input.customerName }),
    where,
    t(locale, "confirmCodeSmsLine3", { minutes: input.minutes }),
    t(locale, "brand"),
  ].join("\n");
}

/** Matches Utility template: {{1}} name, {{2}} salon, {{3}} code */
export function buildConfirmCodeWhatsAppParams(input: {
  customerName: string;
  barberName: string;
  staffName?: string | null;
  code: string;
}) {
  const salon = input.staffName
    ? `${input.barberName} مع ${input.staffName}`
    : input.barberName;
  return [input.customerName, salon, input.code];
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

async function finalizeConfirmedAppointment(
  appointment: {
    id: string;
    bookingGroupId: string | null;
  },
  opts?: { markConfirmationSent?: boolean },
) {
  const markSent = opts?.markConfirmationSent !== false;
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "BOOKED",
      confirmExpiresAt: null,
      confirmCode: null,
      ...(markSent ? { confirmationSentAt: new Date() } : {}),
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

  if (appointment.bookingGroupId) {
    await prisma.appointment.updateMany({
      where: {
        bookingGroupId: appointment.bookingGroupId,
        status: "PENDING_CONFIRM",
        id: { not: appointment.id },
      },
      data: {
        status: "BOOKED",
        confirmExpiresAt: null,
        confirmCode: null,
        ...(markSent ? { confirmationSentAt: new Date() } : {}),
      },
    });
  }

  return updated;
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
  // OTP holds cannot be confirmed by link alone
  if (appointment.confirmCode) {
    return { state: "invalid" as const, appointment };
  }

  const updated = await finalizeConfirmedAppointment(appointment);
  return { state: "success" as const, appointment: updated };
}

/** Customer entered OTP — finalize booking, then send normal booking confirmation. */
export async function confirmPendingAppointmentByCode(
  rawToken: string,
  rawCode: string,
) {
  const appointment = await findAppointmentByConfirmToken(rawToken);
  const state = resolveConfirmState(appointment);
  if (!appointment) return { state: "invalid" as const, appointment: null };
  if (state === "already_confirmed") {
    return { state, appointment };
  }
  if (state !== "confirm") {
    return { state, appointment };
  }
  if (!appointment.confirmCode) {
    return { state: "invalid" as const, appointment };
  }

  const code = sanitizeConfirmCode(rawCode);
  if (!code || code !== appointment.confirmCode) {
    return { state: "wrong_code" as const, appointment };
  }

  // Leave confirmationSentAt null so sendBookingConfirmation can run
  const updated = await finalizeConfirmedAppointment(appointment, {
    markConfirmationSent: false,
  });

  const { sendBookingConfirmation } = await import("@/lib/reminders");
  const notify = await sendBookingConfirmation(updated.id);
  if (!notify.ok && !notify.skipped) {
    console.warn("[confirm] post-OTP booking confirmation failed", {
      appointmentId: updated.id,
      error: notify.error,
      sms: notify.sms,
      whatsapp: notify.whatsapp,
    });
  }

  // Party followers: no separate SMS; mark so they aren't treated as pending notify
  if (appointment.bookingGroupId) {
    await prisma.appointment.updateMany({
      where: {
        bookingGroupId: appointment.bookingGroupId,
        id: { not: appointment.id },
        status: "BOOKED",
        confirmationSentAt: null,
      },
      data: { confirmationSentAt: new Date() },
    });
  }

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

/** Send OTP for bookingRequiresConfirmCode (SMS and/or WhatsApp barbe_confirm_code). */
export async function sendBookingConfirmCodeRequest(appointmentId: string) {
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
  if (!appointment.confirmCode || !appointment.confirmToken) {
    return { ok: false, error: "חסר קוד אישור" };
  }

  const phone = (appointment.customerPhone || "").trim();
  if (!phone) {
    return { ok: false, skipped: true, error: "אין טלפון ללקוח" };
  }

  const smsOn =
    appointment.barber.smsPlanEnabled &&
    appointment.barber.smsConfirmationEnabled;
  const waOn =
    WA_CONFIRM_CODE_ENABLED &&
    appointment.barber.whatsappPlanEnabled &&
    appointment.barber.whatsappConfirmationEnabled;

  if (!smsOn && !waOn) {
    return {
      ok: false,
      error: "נדרש SMS או WhatsApp פעיל לשליחת קוד האישור",
    };
  }

  let sms;
  let whatsapp;

  if (smsOn) {
    sms = await sendCustomerSms({
      barberId: appointment.barberId,
      to: phone,
      body: buildConfirmCodeSms({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        code: appointment.confirmCode,
        minutes: CONFIRM_HOLD_MINUTES,
        locale: appointment.barber.locale,
      }),
    });
  }

  if (waOn) {
    whatsapp = await sendCustomerWhatsApp({
      barberId: appointment.barberId,
      to: phone,
      templateName: WA_TEMPLATE_CONFIRM_CODE,
      languageCode: WA_TEMPLATE_LANG,
      bodyParams: buildConfirmCodeWhatsAppParams({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        code: appointment.confirmCode,
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
      : sms?.error || whatsapp?.error || "שליחת קוד האישור נכשלה",
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
