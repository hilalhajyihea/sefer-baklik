import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { normalizeLocale, t } from "@/lib/i18n";
import { SITE_ADMIN_NAME, SITE_ADMIN_PHONE } from "@/lib/site";

const LOW_QUOTA_THRESHOLD = 10;

/**
 * Reserve one customer-SMS credit before sending.
 * Returns false when remaining is 0 (booking should continue without SMS).
 */
export async function consumeCustomerSmsCredit(barberId: string): Promise<{
  ok: boolean;
  remaining: number;
  crossedLow: boolean;
}> {
  const updated = await prisma.$transaction(async (tx) => {
    const barber = await tx.barber.findUnique({
      where: { id: barberId },
      select: { smsRemaining: true, smsLowNotified: true },
    });
    if (!barber || barber.smsRemaining <= 0) {
      return null;
    }

    const remaining = barber.smsRemaining - 1;
    const crossedLow =
      barber.smsRemaining > LOW_QUOTA_THRESHOLD &&
      remaining <= LOW_QUOTA_THRESHOLD &&
      !barber.smsLowNotified;

    await tx.barber.update({
      where: { id: barberId },
      data: {
        smsRemaining: remaining,
        ...(crossedLow ? { smsLowNotified: true } : {}),
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

/** Refund one credit if send failed after consume. */
export async function refundCustomerSmsCredit(barberId: string) {
  await prisma.barber.updateMany({
    where: { id: barberId },
    data: { smsRemaining: { increment: 1 } },
  });
  // If we refunded back above 10, allow future low alert again
  await prisma.barber.updateMany({
    where: { id: barberId, smsRemaining: { gt: LOW_QUOTA_THRESHOLD } },
    data: { smsLowNotified: false },
  });
}

export async function maybeSendLowQuotaAlert(barberId: string) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: {
      phone: true,
      locale: true,
      smsRemaining: true,
      smsLowNotified: true,
      smsPlanEnabled: true,
    },
  });
  if (!barber?.smsPlanEnabled) return;
  if (!barber.phone?.trim()) return;
  if (barber.smsRemaining > LOW_QUOTA_THRESHOLD) return;
  // Flag already set atomically in consume; still send now

  const locale = normalizeLocale(barber.locale);
  const body = t(locale, "smsQuotaLow", {
    remaining: barber.smsRemaining,
    admin: SITE_ADMIN_NAME,
    phone: SITE_ADMIN_PHONE,
  });

  // Does NOT consume customer quota (barber-facing alert)
  await sendSms(barber.phone, body);
}

/**
 * Send SMS to a customer only if plan + quota allow.
 * Counts 1 credit per successful send. Triggers one-time ≤10 alert.
 */
export async function sendCustomerSms(input: {
  barberId: string;
  to: string;
  body: string;
}): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  sid?: string;
  to?: string;
}> {
  const credit = await consumeCustomerSmsCredit(input.barberId);
  if (!credit.ok) {
    return {
      ok: false,
      skipped: true,
      error: "נגמרה מכסת ההודעות",
    };
  }

  const result = await sendSms(input.to, input.body);
  if (!result.ok || result.skipped) {
    await refundCustomerSmsCredit(input.barberId);
    return result;
  }

  if (credit.crossedLow) {
    void maybeSendLowQuotaAlert(input.barberId);
  }

  return result;
}

export async function setBarberSmsQuota(input: {
  barberId: string;
  quota: number;
  remaining?: number;
}) {
  const quota = Math.max(0, Math.floor(input.quota));
  const remaining =
    input.remaining !== undefined
      ? Math.max(0, Math.floor(input.remaining))
      : quota;

  return prisma.barber.update({
    where: { id: input.barberId },
    data: {
      smsQuota: quota,
      smsRemaining: remaining,
      smsLowNotified: remaining > LOW_QUOTA_THRESHOLD ? false : true,
    },
    select: {
      id: true,
      smsQuota: true,
      smsRemaining: true,
      smsLowNotified: true,
    },
  });
}

export async function addBarberSmsCredits(barberId: string, amount: number) {
  const add = Math.max(0, Math.floor(amount));
  if (add === 0) {
    return prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, smsQuota: true, smsRemaining: true, smsLowNotified: true },
    });
  }

  return prisma.barber.update({
    where: { id: barberId },
    data: {
      smsQuota: { increment: add },
      smsRemaining: { increment: add },
      smsLowNotified: false,
    },
    select: {
      id: true,
      smsQuota: true,
      smsRemaining: true,
      smsLowNotified: true,
    },
  });
}
