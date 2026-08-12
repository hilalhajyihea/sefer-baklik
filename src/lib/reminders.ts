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
  if (!appointment.barber.smsPlanEnabled) {
    return { ok: false, skipped: true, error: "שירות SMS אינו פעיל במנוי" };
  }
  if (!appointment.barber.smsConfirmationEnabled) {
    return { ok: false, skipped: true, error: "אישור SMS כבוי אצל הספר" };
  }
  if (appointment.confirmationSentAt) {
    return { ok: true, skipped: true, error: "אישור כבר נשלח" };
  }

  const phone = (appointment.customerPhone || "").trim();
  if (!phone) {
    return { ok: false, skipped: true, error: "אין טלפון ללקוח" };
  }

  let cancelUrl: string | undefined;
  if (appointment.barber.customerCancelEnabled) {
    const cancelToken = await ensureCancelToken(appointment);
    cancelUrl = buildCancelUrl(cancelToken);
  }

  const result = await sendCustomerSms({
    barberId: appointment.barberId,
    to: phone,
    body: buildConfirmationSms({
      customerName: appointment.customerName,
      barberName: appointment.barber.displayName,
      staffName: appointment.staff?.displayName,
      startsAt: appointment.startsAt,
      cancelUrl,
      locale: appointment.barber.locale,
    }),
  });

  if (result.ok && !result.skipped) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { confirmationSentAt: new Date() },
    });
  }

  return result;
}

/** Find due reminders and send them. Safe to call every minute. */
export async function processDueReminders() {
  await resetMonthlySmsQuotasIfNeeded();

  const now = new Date();
  const barbers = await prisma.barber.findMany({
    where: { isActive: true, smsPlanEnabled: true, smsReminderEnabled: true },
    select: {
      id: true,
      displayName: true,
      reminderMinutesBefore: true,
      customerCancelEnabled: true,
      locale: true,
      smsRemaining: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const barber of barbers) {
    if (barber.smsRemaining <= 0) {
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

      let cancelUrl: string | undefined;
      if (barber.customerCancelEnabled) {
        const cancelToken = await ensureCancelToken(appointment);
        cancelUrl = buildCancelUrl(cancelToken);
      }

      const result = await sendCustomerSms({
        barberId: barber.id,
        to: phone,
        body: buildReminderSms({
          customerName: appointment.customerName,
          barberName: barber.displayName,
          staffName: appointment.staff?.displayName,
          startsAt: appointment.startsAt,
          minutesBefore: minutes,
          cancelUrl,
          locale: barber.locale,
        }),
      });

      if (result.ok && !result.skipped) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } else if (result.skipped) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { sent, failed, skipped };
}
