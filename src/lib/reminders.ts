import { prisma } from "@/lib/prisma";
import { buildCancelUrl, ensureCancelToken } from "@/lib/cancel";
import {
  buildConfirmationSms,
  buildReminderSms,
} from "@/lib/sms";
import {
  resetMonthlySmsQuotasIfNeeded,
  sendCustomerSms,
} from "@/lib/smsQuota";
import {
  resetMonthlyWhatsappQuotasIfNeeded,
  sendCustomerWhatsApp,
} from "@/lib/whatsappQuota";
import {
  WA_TEMPLATE_CONFIRM,
  WA_TEMPLATE_REMINDER,
  buildConfirmWhatsAppParams,
  buildReminderWhatsAppParams,
} from "@/lib/whatsapp";
import { formatDateLocalized } from "@/lib/i18n";
import { formatTime } from "@/lib/time";

function fallbackCancelUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "https://sefer-baklik.onrender.com"
  );
}

async function resolveCancelUrl(
  appointment: { id: string; cancelToken: string | null },
  customerCancelEnabled: boolean,
) {
  if (!customerCancelEnabled) return fallbackCancelUrl();
  const cancelToken = await ensureCancelToken(appointment);
  return buildCancelUrl(cancelToken);
}

type ChannelResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
};

function channelSuccess(r: ChannelResult | undefined) {
  return Boolean(r && r.ok && !r.skipped);
}

export async function sendBookingConfirmation(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      barber: true,
      staff: { select: { displayName: true } },
    },
  });
  if (!appointment || appointment.status !== "BOOKED") {
    return { ok: false, error: "תור לא נמצא" };
  }

  const smsOn =
    appointment.barber.smsPlanEnabled &&
    appointment.barber.smsConfirmationEnabled;
  const waOn =
    appointment.barber.whatsappPlanEnabled &&
    appointment.barber.whatsappConfirmationEnabled;

  if (!smsOn && !waOn) {
    return {
      ok: false,
      skipped: true,
      error: "שירות הודעות אינו פעיל במנוי",
    };
  }
  if (appointment.confirmationSentAt) {
    return { ok: true, skipped: true, error: "אישור כבר נשלח" };
  }

  const phone = (appointment.customerPhone || "").trim();
  if (!phone) {
    return { ok: false, skipped: true, error: "אין טלפון ללקוח" };
  }

  const cancelUrl = await resolveCancelUrl(
    appointment,
    appointment.barber.customerCancelEnabled,
  );
  const cancelUrlForSms = appointment.barber.customerCancelEnabled
    ? cancelUrl
    : undefined;

  let sms: ChannelResult | undefined;
  let whatsapp: ChannelResult | undefined;

  if (smsOn) {
    sms = await sendCustomerSms({
      barberId: appointment.barberId,
      to: phone,
      body: buildConfirmationSms({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        startsAt: appointment.startsAt,
        cancelUrl: cancelUrlForSms,
        locale: appointment.barber.locale,
      }),
    });
  }

  if (waOn) {
    whatsapp = await sendCustomerWhatsApp({
      barberId: appointment.barberId,
      to: phone,
      templateName: WA_TEMPLATE_CONFIRM,
      bodyParams: buildConfirmWhatsAppParams({
        customerName: appointment.customerName,
        barberName: appointment.barber.displayName,
        staffName: appointment.staff?.displayName,
        dateLabel: formatDateLocalized("ar", appointment.startsAt),
        timeLabel: formatTime(appointment.startsAt),
        cancelUrl,
      }),
    });
  }

  const anyOk = channelSuccess(sms) || channelSuccess(whatsapp);
  if (anyOk) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { confirmationSentAt: new Date() },
    });
  }

  const primaryError =
    (!channelSuccess(sms) && sms && !sms.skipped ? sms.error : undefined) ||
    (!channelSuccess(whatsapp) && whatsapp && !whatsapp.skipped
      ? whatsapp.error
      : undefined) ||
    (sms?.skipped && !waOn ? sms.error : undefined) ||
    (whatsapp?.skipped && !smsOn ? whatsapp.error : undefined);

  return {
    ok: anyOk,
    skipped: !anyOk && Boolean(sms?.skipped || whatsapp?.skipped),
    error: anyOk ? undefined : primaryError,
    sms,
    whatsapp,
  };
}

/** Find due reminders and send them. Safe to call every minute. */
export async function processDueReminders() {
  await resetMonthlySmsQuotasIfNeeded();
  await resetMonthlyWhatsappQuotasIfNeeded();

  const now = new Date();
  const barbers = await prisma.barber.findMany({
    where: {
      isActive: true,
      OR: [
        { smsPlanEnabled: true, smsReminderEnabled: true },
        { whatsappPlanEnabled: true, whatsappReminderEnabled: true },
      ],
    },
    select: {
      id: true,
      displayName: true,
      reminderMinutesBefore: true,
      customerCancelEnabled: true,
      locale: true,
      smsPlanEnabled: true,
      smsReminderEnabled: true,
      smsRemaining: true,
      whatsappPlanEnabled: true,
      whatsappReminderEnabled: true,
      whatsappRemaining: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const barber of barbers) {
    const smsOn =
      barber.smsPlanEnabled &&
      barber.smsReminderEnabled &&
      barber.smsRemaining > 0;
    const waOn =
      barber.whatsappPlanEnabled &&
      barber.whatsappReminderEnabled &&
      barber.whatsappRemaining > 0;

    if (!smsOn && !waOn) {
      continue;
    }

    const minutes = Math.max(5, Math.min(24 * 60, barber.reminderMinutesBefore));
    const windowEnd = new Date(now.getTime() + minutes * 60_000);

    const due = await prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        status: "BOOKED",
        reminderSentAt: null,
        startsAt: { gt: now, lte: windowEnd },
      },
      include: {
        staff: { select: { displayName: true } },
      },
      take: 50,
    });

    for (const appointment of due) {
      const phone = (appointment.customerPhone || "").trim();
      if (!phone) {
        skipped += 1;
        continue;
      }

      const cancelUrl = await resolveCancelUrl(
        appointment,
        barber.customerCancelEnabled,
      );
      const cancelUrlForSms = barber.customerCancelEnabled
        ? cancelUrl
        : undefined;

      let sms: ChannelResult | undefined;
      let whatsapp: ChannelResult | undefined;

      if (smsOn) {
        sms = await sendCustomerSms({
          barberId: barber.id,
          to: phone,
          body: buildReminderSms({
            customerName: appointment.customerName,
            barberName: barber.displayName,
            staffName: appointment.staff?.displayName,
            startsAt: appointment.startsAt,
            minutesBefore: minutes,
            cancelUrl: cancelUrlForSms,
            locale: barber.locale,
          }),
        });
      }

      if (waOn) {
        whatsapp = await sendCustomerWhatsApp({
          barberId: barber.id,
          to: phone,
          templateName: WA_TEMPLATE_REMINDER,
          bodyParams: buildReminderWhatsAppParams({
            customerName: appointment.customerName,
            barberName: barber.displayName,
            staffName: appointment.staff?.displayName,
            minutesBefore: minutes,
            timeLabel: formatTime(appointment.startsAt),
            cancelUrl,
          }),
        });
      }

      const anyOk = channelSuccess(sms) || channelSuccess(whatsapp);
      if (anyOk) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } else if (sms?.skipped || whatsapp?.skipped) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { sent, failed, skipped };
}
