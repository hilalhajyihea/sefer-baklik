import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { resetMonthlyWhatsappQuotasIfNeeded } from "@/lib/whatsappQuota";
import { whatsappConfigStatus } from "@/lib/whatsapp";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  await resetMonthlyWhatsappQuotasIfNeeded();

  const locale = await getBarberLocale(session.barberId);
  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: {
      phone: true,
      whatsappPlanEnabled: true,
      whatsappConfirmationEnabled: true,
      whatsappReminderEnabled: true,
      notifyOnCustomerCancelWhatsapp: true,
      reminderMinutesBefore: true,
      whatsappQuota: true,
      whatsappRemaining: true,
    },
  });

  if (!barber) {
    return NextResponse.json(
      { error: t(locale, "errBarberNotFound") },
      { status: 404 },
    );
  }

  return NextResponse.json({
    settings: barber,
    provider: whatsappConfigStatus(),
  });
}

const schema = z.object({
  phone: z.string().max(20).optional(),
  notifyOnCustomerCancelWhatsapp: z.boolean().optional(),
  whatsappConfirmationEnabled: z.boolean().optional(),
  whatsappReminderEnabled: z.boolean().optional(),
  reminderMinutesBefore: z.number().int().min(5).max(1440).optional(),
});

export async function PUT(request: Request) {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: { whatsappPlanEnabled: true },
  });
  if (!barber) {
    return NextResponse.json(
      { error: t(locale, "errBarberNotFound") },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || t(locale, "errInvalidData"),
      },
      { status: 400 },
    );
  }

  const wantsWaToggles =
    parsed.data.whatsappConfirmationEnabled !== undefined ||
    parsed.data.whatsappReminderEnabled !== undefined ||
    parsed.data.reminderMinutesBefore !== undefined;

  if (wantsWaToggles && !barber.whatsappPlanEnabled) {
    return NextResponse.json(
      { error: t(locale, "errWhatsappPlanInactive") },
      { status: 403 },
    );
  }

  const phone =
    parsed.data.phone !== undefined
      ? parsed.data.phone.trim() || null
      : undefined;

  const settings = await prisma.barber.update({
    where: { id: session.barberId },
    data: {
      ...(phone !== undefined ? { phone } : {}),
      ...(parsed.data.notifyOnCustomerCancelWhatsapp !== undefined
        ? {
            notifyOnCustomerCancelWhatsapp:
              parsed.data.notifyOnCustomerCancelWhatsapp,
          }
        : {}),
      ...(parsed.data.whatsappConfirmationEnabled !== undefined
        ? {
            whatsappConfirmationEnabled:
              parsed.data.whatsappConfirmationEnabled,
          }
        : {}),
      ...(parsed.data.whatsappReminderEnabled !== undefined
        ? { whatsappReminderEnabled: parsed.data.whatsappReminderEnabled }
        : {}),
      ...(parsed.data.reminderMinutesBefore !== undefined
        ? { reminderMinutesBefore: parsed.data.reminderMinutesBefore }
        : {}),
    },
    select: {
      phone: true,
      whatsappPlanEnabled: true,
      whatsappConfirmationEnabled: true,
      whatsappReminderEnabled: true,
      notifyOnCustomerCancelWhatsapp: true,
      reminderMinutesBefore: true,
      whatsappQuota: true,
      whatsappRemaining: true,
    },
  });

  return NextResponse.json({
    settings,
    provider: whatsappConfigStatus(),
  });
}
