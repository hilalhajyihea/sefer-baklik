import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeamOrSoloSlots } from "@/lib/availability";
import { normalizeLocale, t } from "@/lib/i18n";

const schema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staff: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  let locale: ReturnType<typeof normalizeLocale> = "he";
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      slug: searchParams.get("slug"),
      date: searchParams.get("date"),
      staff: searchParams.get("staff") || undefined,
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

    const slots = await getTeamOrSoloSlots(
      barber.id,
      parsed.data.date,
      parsed.data.staff,
    );
    return NextResponse.json({ slots, slotMinutes: barber.slotMinutes });
  } catch (error) {
    console.error("availability error", error);
    return NextResponse.json({ error: t(locale, "errServer") }, { status: 500 });
  }
}
