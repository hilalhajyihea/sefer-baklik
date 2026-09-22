import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/availability";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";
import { sendBookingConfirmation } from "@/lib/reminders";
import {
  confirmExpiresAt,
  generateConfirmToken,
  sendBookingConfirmRequest,
} from "@/lib/confirm";
import { CONFIRM_HOLD_MINUTES } from "@/lib/appointmentStatus";
import { isTeamMode } from "@/lib/staff";

export async function POST(request: Request) {
  let locale: Locale = "he";
  try {
    const body = await request.json();
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const barberPreview = slug
      ? await prisma.barber.findUnique({
          where: { slug },
          select: { locale: true },
        })
      : null;
    locale = normalizeLocale(barberPreview?.locale);

    const schema = z.object({
      slug: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      customerName: z.string().min(2, t(locale, "errNameRequired")).max(80),
      customerPhone: z
        .string()
        .min(9, t(locale, "errPhoneRequired"))
        .max(20)
        .regex(/^[\d+\-\s()]+$/, t(locale, "errPhoneInvalid")),
      staff: z.string().min(1).optional(),
    });

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

    const barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (!barber || !barber.isActive) {
      return NextResponse.json(
        { error: t(locale, "errBarberNotFound") },
        { status: 404 },
      );
    }
    locale = normalizeLocale(barber.locale);

    const team = await isTeamMode(barber.id);
    if (team && !parsed.data.staff) {
      return NextResponse.json(
        { error: t(locale, "errStaffRequired") },
        { status: 400 },
      );
    }

    const requiresConfirm = Boolean(barber.bookingRequiresConfirm);

    if (requiresConfirm) {
      const canSms =
        barber.smsPlanEnabled && barber.smsConfirmationEnabled;
      const canWa =
        barber.whatsappPlanEnabled && barber.whatsappConfirmationEnabled;
      if (!canSms && !canWa) {
        return NextResponse.json(
          { error: t(locale, "errConfirmChannelRequired") },
          { status: 409 },
        );
      }
    }

    const confirmToken = requiresConfirm ? generateConfirmToken() : null;

    const appointment = await bookAppointment({
      barberId: barber.id,
      dateKey: parsed.data.date,
      time: parsed.data.time,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      staffKey: parsed.data.staff,
      ...(requiresConfirm
        ? {
            status: "PENDING_CONFIRM" as const,
            confirmToken,
            confirmExpiresAt: confirmExpiresAt(),
          }
        : {}),
    });

    if (requiresConfirm) {
      const notify = await sendBookingConfirmRequest(appointment.id);
      if (!notify.ok) {
        console.warn("[bookings] confirm-request notify failed", notify);
        // No link delivered — release the hold so the slot isn't stuck
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "CANCELLED" },
        });
        return NextResponse.json(
          {
            error:
              notify.error || t(locale, "bookConfirmNotifyFailed"),
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        appointment: {
          id: appointment.id,
          startsAt: appointment.startsAt.toISOString(),
          customerName: appointment.customerName,
          staffId: appointment.staffId,
          status: appointment.status,
        },
        needsConfirm: true,
        confirmMinutes: CONFIRM_HOLD_MINUTES,
        sms: notify?.sms
          ? {
              ok: !!notify.sms.ok,
              skipped: !!notify.sms.skipped,
              error: notify.sms.error || null,
            }
          : null,
        whatsapp: notify?.whatsapp
          ? {
              ok: !!notify.whatsapp.ok,
              skipped: !!notify.whatsapp.skipped,
              error: notify.whatsapp.error || null,
            }
          : null,
      });
    }

    const notify = await sendBookingConfirmation(appointment.id);

    if (notify?.whatsapp && !notify.whatsapp.ok) {
      console.warn("[bookings] WhatsApp confirmation", {
        appointmentId: appointment.id,
        skipped: notify.whatsapp.skipped,
        error: notify.whatsapp.error,
      });
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        startsAt: appointment.startsAt.toISOString(),
        customerName: appointment.customerName,
        staffId: appointment.staffId,
        status: appointment.status,
      },
      needsConfirm: false,
      sms: notify?.sms
        ? {
            ok: !!notify.sms.ok,
            skipped: !!notify.sms.skipped,
            error: notify.sms.error || null,
          }
        : null,
      whatsapp: notify?.whatsapp
        ? {
            ok: !!notify.whatsapp.ok,
            skipped: !!notify.whatsapp.skipped,
            error: notify.whatsapp.error || null,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const heMap: Record<
      string,
      "errBarberInactive" | "errSlotUnavailable" | "errSlotTaken"
    > = {
      "הספר לא פעיל": "errBarberInactive",
      "השעה אינה פנויה": "errSlotUnavailable",
      "השעה נתפסה בינתיים": "errSlotTaken",
    };
    const key = heMap[message];
    return NextResponse.json(
      { error: key ? t(locale, key) : message || t(locale, "bookFailed") },
      { status: 409 },
    );
  }
}
