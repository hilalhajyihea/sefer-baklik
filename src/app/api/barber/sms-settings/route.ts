import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBarberSession } from "@/lib/auth";
import { getBarberLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const locale = await getBarberLocale(session.barberId);
  const barber = await prisma.barber.findUnique({
    where: { id: session.barberId },
    select: {
      smsPlanEnabled: true,
      smsConfirmationEnabled: true,
      smsReminderEnabled: true,
      reminderMinutesBefore: true,
      phone: true,
      notifyOnCustomerCancel: true,
      smsQuota: true,
      smsRemaining: true,
    },
  });

  if (!barber) {
    return NextResponse.json(
      { error: t(locale, "errBarberNotFound") },
      { status: 404 },
    );
  }

  return NextResponse.json({ settings: barber });
}

const schema = z.object({
  phone: z.string().max(20).optional(),
  notifyOnCustomerCancel: z.boolean().optional(),
  smsConfirmationEnabled: z.boolean().optional(),
  smsReminderEnabled: z.boolean().optional(),
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
    select: { smsPlanEnabled: true },
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

  const wantsSmsToggles =
    parsed.data.smsConfirmationEnabled !== undefined ||
    parsed.data.smsReminderEnabled !== undefined ||
    parsed.data.reminderMinutesBefore !== undefined;

  if (wantsSmsToggles && !barber.smsPlanEnabled) {
    return NextResponse.json(
      { error: t(locale, "errSmsPlanInactive") },
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
      ...(parsed.data.notifyOnCustomerCancel !== undefined
        ? { notifyOnCustomerCancel: parsed.data.notifyOnCustomerCancel }
        : {}),
      ...(parsed.data.smsConfirmationEnabled !== undefined
        ? { smsConfirmationEnabled: parsed.data.smsConfirmationEnabled }
        : {}),
      ...(parsed.data.smsReminderEnabled !== undefined
        ? { smsReminderEnabled: parsed.data.smsReminderEnabled }
        : {}),
      ...(parsed.data.reminderMinutesBefore !== undefined
        ? { reminderMinutesBefore: parsed.data.reminderMinutesBefore }
        : {}),
    },
    select: {
      smsPlanEnabled: true,
      smsConfirmationEnabled: true,
      smsReminderEnabled: true,
      reminderMinutesBefore: true,
      phone: true,
      notifyOnCustomerCancel: true,
      smsQuota: true,
      smsRemaining: true,
    },
  });

  return NextResponse.json({ settings });
}
