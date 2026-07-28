import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";

const schema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      slug: searchParams.get("slug"),
      date: searchParams.get("date"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "פרמטרים לא תקינים" }, { status: 400 });
    }

    const barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (!barber || !barber.isActive) {
      return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
    }

    const slots = await getAvailableSlots(barber.id, parsed.data.date);
    return NextResponse.json({ slots, slotMinutes: barber.slotMinutes });
  } catch (error) {
    console.error("availability error", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
