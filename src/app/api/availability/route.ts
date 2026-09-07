import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamOrSoloSlots } from "@/lib/availability";
import { normalizeLocale, t } from "@/lib/i18n";
import { ALLOWED_SLOT_MINUTES, resolveSlotMinutes } from "@/lib/slotMinutes";

const schema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staff: z.string().min(1).optional(),
  slotMinutes: z.coerce.number().int().optional(),
});

export async function GET(request: Request) {
  let locale: ReturnType<typeof normalizeLocale> = "he";
  try {
    const { searchParams } = new URL(request.url);
    const rawSlot = searchParams.get("slotMinutes");
    const parsed = schema.safeParse({
      slug: searchParams.get("slug"),
      date: searchParams.get("date"),
      staff: searchParams.get("staff") || undefined,
      slotMinutes: rawSlot ? Number(rawSlot) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, "errParams") }, { status: 400 });
    }

    const barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.slug },
    });
    locale = normalizeLocale(barber?.locale);
    if (!barber || !barber.isActive) {
      return NextResponse.json(
        { error: t(locale, "errBarberNotFound") },
        { status: 404 },
      );
    }

    const slotMinutes = resolveSlotMinutes(
      parsed.data.slotMinutes,
      barber.slotMinutes,
    );

    const slots = await getTeamOrSoloSlots(
      barber.id,
      parsed.data.date,
      parsed.data.staff,
      slotMinutes,
    );
    return NextResponse.json({
      slots,
      slotMinutes,
      allowedSlotMinutes: ALLOWED_SLOT_MINUTES,
    });
  } catch (error) {
    console.error("availability error", error);
    return NextResponse.json({ error: t(locale, "errServer") }, { status: 500 });
  }
}
