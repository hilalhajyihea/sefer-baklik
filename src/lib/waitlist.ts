import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";
import { getSiteUrl } from "@/lib/seo";
import { isTeamMode, getActiveStaff } from "@/lib/staff";
import {
  combineDateAndTime,
  dateKeyToDbDate,
  getJerusalemDayOfWeek,
  toDateKey,
} from "@/lib/time";
import { formatDateLocalized, normalizeLocale, t } from "@/lib/i18n";

export const MAX_WAITLIST_PER_DAY = 5;

/** WhatsApp template name in Meta (typo preserved). Disabled until approved. */
export const WA_TEMPLATE_WAITLIST = "barber_wating_list_ar";
export const WA_WAITLIST_ENABLED = false;

export function buildBarberBookingUrl(slug: string) {
  return `${getSiteUrl()}/${slug}`;
}

export function buildWaitlistOpenSms(input: {
  customerName: string;
  barberName: string;
  dateLabel: string;
  bookingUrl: string;
  locale?: string | null;
}): string {
  const locale = normalizeLocale(input.locale);
  return [
    t(locale, "waitlistSmsLine1", { name: input.customerName }),
    t(locale, "waitlistSmsLine2", {
      barber: input.barberName,
      date: input.dateLabel,
    }),
    t(locale, "waitlistSmsLinkLabel"),
    input.bookingUrl,
    t(locale, "brand"),
  ].join("\n");
}

export function buildWaitlistWhatsAppParams(input: {
  customerName: string;
  barberName: string;
  dateLabel: string;
  bookingUrl: string;
}) {
  return [
    input.customerName,
    input.barberName,
    input.dateLabel,
    input.bookingUrl,
  ];
}

/** True when the shop/staff would normally take bookings that day (not day-off). */
export async function isActiveWorkingDay(
  barberId: string,
  dateKey: string,
): Promise<boolean> {
  const shopOff = await prisma.dayOff.findUnique({
    where: {
      barberId_date: { barberId, date: dateKeyToDbDate(dateKey) },
    },
  });
  if (shopOff) return false;

  const dayOfWeek = getJerusalemDayOfWeek(combineDateAndTime(dateKey, "12:00"));
  const team = await isTeamMode(barberId);

  if (!team) {
    const hours = await prisma.workingHours.findUnique({
      where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
    });
    return Boolean(hours);
  }

  const staff = await getActiveStaff(barberId);
  for (const s of staff) {
    const staffOff = await prisma.staffDayOff.findUnique({
      where: {
        staffId_date: { staffId: s.id, date: dateKeyToDbDate(dateKey) },
      },
    });
    if (staffOff) continue;
    const hours = await prisma.staffWorkingHours.findUnique({
      where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek } },
    });
    if (hours) return true;
  }
  return false;
}

export async function countWaitlistForDay(barberId: string, dateKey: string) {
  return prisma.waitlistEntry.count({
    where: { barberId, date: dateKeyToDbDate(dateKey) },
  });
}

export async function joinWaitlist(input: {
  barberId: string;
  dateKey: string;
  customerName: string;
  customerPhone: string;
}) {
  const phoneKey = normalizePhoneE164(input.customerPhone);
  if (!phoneKey) {
    throw new Error("INVALID_PHONE");
  }

  const active = await isActiveWorkingDay(input.barberId, input.dateKey);
  if (!active) {
    throw new Error("DAY_CLOSED");
  }

  const date = dateKeyToDbDate(input.dateKey);
  const existing = await prisma.waitlistEntry.findUnique({
    where: {
      barberId_date_phoneKey: {
        barberId: input.barberId,
        date,
        phoneKey,
      },
    },
  });
  if (existing) {
    throw new Error("ALREADY_ON_LIST");
  }

  const count = await countWaitlistForDay(input.barberId, input.dateKey);
  if (count >= MAX_WAITLIST_PER_DAY) {
    throw new Error("LIST_FULL");
  }

  return prisma.waitlistEntry.create({
    data: {
      barberId: input.barberId,
      date,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      phoneKey,
    },
  });
}

/** After a successful booking — drop this phone from that day's waitlist. */
export async function removeFromWaitlistOnBooking(input: {
  barberId: string;
  dateKey: string;
  customerPhone: string;
}) {
  const phoneKey = normalizePhoneE164(input.customerPhone);
  if (!phoneKey) return { removed: 0 };
  const result = await prisma.waitlistEntry.deleteMany({
    where: {
      barberId: input.barberId,
      date: dateKeyToDbDate(input.dateKey),
      phoneKey,
    },
  });
  return { removed: result.count };
}

/**
 * Notify everyone still on the waitlist that a slot opened for dateKey.
 * SMS active now; WhatsApp gated by WA_WAITLIST_ENABLED.
 */
export async function notifyWaitlistSlotOpened(input: {
  barberId: string;
  dateKey: string;
}) {
  const barber = await prisma.barber.findUnique({
    where: { id: input.barberId },
  });
  if (!barber || !barber.isActive) return { notified: 0 };

  const entries = await prisma.waitlistEntry.findMany({
    where: {
      barberId: input.barberId,
      date: dateKeyToDbDate(input.dateKey),
    },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length === 0) return { notified: 0 };

  const locale = normalizeLocale(barber.locale);
  const dateLabel = formatDateLocalized(
    locale,
    combineDateAndTime(input.dateKey, "12:00"),
  );
  const dateLabelAr = formatDateLocalized(
    "ar",
    combineDateAndTime(input.dateKey, "12:00"),
  );
  const bookingUrl = buildBarberBookingUrl(barber.slug);

  let notified = 0;

  for (const entry of entries) {
    if (barber.smsPlanEnabled) {
      const { sendCustomerSms } = await import("@/lib/smsQuota");
      const result = await sendCustomerSms({
        barberId: barber.id,
        to: entry.customerPhone,
        body: buildWaitlistOpenSms({
          customerName: entry.customerName,
          barberName: barber.displayName,
          dateLabel,
          bookingUrl,
          locale,
        }),
      });
      if (result.ok && !result.skipped) notified += 1;
    }

    if (WA_WAITLIST_ENABLED && barber.whatsappPlanEnabled) {
      const { sendCustomerWhatsApp } = await import("@/lib/whatsappQuota");
      const { WA_TEMPLATE_LANG } = await import("@/lib/whatsapp");
      await sendCustomerWhatsApp({
        barberId: barber.id,
        to: entry.customerPhone,
        templateName: WA_TEMPLATE_WAITLIST,
        languageCode: WA_TEMPLATE_LANG,
        bodyParams: buildWaitlistWhatsAppParams({
          customerName: entry.customerName,
          barberName: barber.displayName,
          dateLabel: dateLabelAr,
          bookingUrl,
        }),
      });
    }
  }

  return { notified };
}

export async function notifyWaitlistForAppointmentDate(startsAt: Date, barberId: string) {
  const dateKey = toDateKey(startsAt);
  return notifyWaitlistSlotOpened({ barberId, dateKey });
}
