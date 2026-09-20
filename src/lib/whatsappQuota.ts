import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { normalizeLocale, t } from "@/lib/i18n";
import { SITE_ADMIN_NAME, SITE_ADMIN_PHONE } from "@/lib/site";
import { getSmsQuotaPeriod } from "@/lib/smsQuota";

const LOW_QUOTA_THRESHOLD = 10;

/**
 * On the 1st of each month (Israel time), reset WhatsApp remaining = monthly quota.
 */
export async function resetMonthlyWhatsappQuotasIfNeeded(): Promise<{
  reset: number;
}> {
  const period = getSmsQuotaPeriod();
  const stale = await prisma.barber.findMany({
    where: {
      OR: [
        { whatsappQuotaMonth: null },
        { whatsappQuotaMonth: { not: period } },
      ],
    },
    select: { id: true, whatsappQuota: true },
  });
  if (stale.length === 0) {
    return { reset: 0 };
  }

  await prisma.$transaction(
    stale.map((b) =>
      prisma.barber.update({
        where: { id: b.id },
        data: {
          whatsappRemaining: b.whatsappQuota,
          whatsappLowNotified: false,
          whatsappQuotaMonth: period,
        },
      }),
    ),
  );

  return { reset: stale.length };
}

export async function consumeCustomerWhatsappCredit(barberId: string): Promise<{
  ok: boolean;
  remaining: number;
  crossedLow: boolean;
}> {
  await resetMonthlyWhatsappQuotasIfNeeded();

  const updated = await prisma.$transaction(async (tx) => {
    const barber = await tx.barber.findUnique({
      where: { id: barberId },
      select: { whatsappRemaining: true, whatsappLowNotified: true },
    });
    if (!barber || barber.whatsappRemaining <= 0) {
      return null;
    }

    const remaining = barber.whatsappRemaining - 1;
    const crossedLow =
      barber.whatsappRemaining > LOW_QUOTA_THRESHOLD &&
      remaining <= LOW_QUOTA_THRESHOLD &&
      !barber.whatsappLowNotified;

    await tx.barber.update({
      where: { id: barberId },
      data: {
        whatsappRemaining: remaining,
        ...(crossedLow ? { whatsappLowNotified: true } : {}),
      },
    });

    return { remaining, crossedLow };
  });

  if (!updated) {
    return { ok: false, remaining: 0, crossedLow: false };
  }

  return {
    ok: true,
    remaining: updated.remaining,
    crossedLow: updated.crossedLow,
  };
}

export async function refundCustomerWhatsappCredit(barberId: string) {
  await prisma.barber.updateMany({
    where: { id: barberId },
    data: { whatsappRemaining: { increment: 1 } },
  });
  await prisma.barber.updateMany({
    where: { id: barberId, whatsappRemaining: { gt: LOW_QUOTA_THRESHOLD } },
    data: { whatsappLowNotified: false },
  });
}

export async function maybeSendLowWhatsappQuotaAlert(barberId: string) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: {
      phone: true,
      locale: true,
      whatsappRemaining: true,
      whatsappPlanEnabled: true,
    },
  });
  if (!barber?.whatsappPlanEnabled) return;
  if (!barber.phone?.trim()) return;
  if (barber.whatsappRemaining > LOW_QUOTA_THRESHOLD) return;

  const locale = normalizeLocale(barber.locale);
  const body = t(locale, "whatsappQuotaLow", {
    remaining: barber.whatsappRemaining,
    admin: SITE_ADMIN_NAME,
    phone: SITE_ADMIN_PHONE,
  });

  await sendSms(barber.phone, body);
}

export async function sendCustomerWhatsApp(input: {
  barberId: string;
  to: string;
  templateName: string;
  bodyParams: string[];
  languageCode?: string;
}): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
}> {
  const credit = await consumeCustomerWhatsappCredit(input.barberId);
  if (!credit.ok) {
    return {
      ok: false,
      skipped: true,
      error: "נגמרה מכסת WhatsApp",
    };
  }

  const result = await sendWhatsAppTemplate({
    to: input.to,
    templateName: input.templateName,
    languageCode: input.languageCode,
    bodyParams: input.bodyParams,
  });

  if (!result.ok || result.skipped) {
    await refundCustomerWhatsappCredit(input.barberId);
    return result;
  }

  if (credit.crossedLow) {
    void maybeSendLowWhatsappQuotaAlert(input.barberId);
  }

  return result;
}

export async function setBarberWhatsappQuota(input: {
  barberId: string;
  quota: number;
  remaining?: number;
}) {
  const quota = Math.max(0, Math.floor(input.quota));
  const remaining =
    input.remaining !== undefined
      ? Math.max(0, Math.floor(input.remaining))
      : quota;
  const period = getSmsQuotaPeriod();

  return prisma.barber.update({
    where: { id: input.barberId },
    data: {
      whatsappQuota: quota,
      whatsappRemaining: remaining,
      whatsappQuotaMonth: period,
      whatsappLowNotified: remaining > LOW_QUOTA_THRESHOLD ? false : true,
    },
    select: {
      id: true,
      whatsappQuota: true,
      whatsappRemaining: true,
      whatsappLowNotified: true,
      whatsappQuotaMonth: true,
    },
  });
}

export async function addBarberWhatsappCredits(
  barberId: string,
  amount: number,
) {
  const add = Math.max(0, Math.floor(amount));
  if (add === 0) {
    return prisma.barber.findUnique({
      where: { id: barberId },
      select: {
        id: true,
        whatsappQuota: true,
        whatsappRemaining: true,
        whatsappLowNotified: true,
        whatsappQuotaMonth: true,
      },
    });
  }

  await resetMonthlyWhatsappQuotasIfNeeded();

  return prisma.barber.update({
    where: { id: barberId },
    data: {
      whatsappRemaining: { increment: add },
      whatsappLowNotified: false,
    },
    select: {
      id: true,
      whatsappQuota: true,
      whatsappRemaining: true,
      whatsappLowNotified: true,
      whatsappQuotaMonth: true,
    },
  });
}
