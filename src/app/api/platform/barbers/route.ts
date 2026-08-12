import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBarber, isValidSlug, resetBarberPassword } from "@/lib/barbers";
import { addBarberSmsCredits, setBarberSmsQuota } from "@/lib/smsQuota";

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const barbers = await prisma.barber.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      username: true,
      isActive: true,
      locale: true,
      slotMinutes: true,
      smsPlanEnabled: true,
      customerCancelEnabled: true,
      smsQuota: true,
      smsRemaining: true,
      createdAt: true,
      _count: { select: { appointments: true } },
      staff: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          displayName: true,
          isActive: true,
          sortOrder: true,
        },
      },
    },
  });

  return NextResponse.json({ barbers });
}

const createSchema = z.object({
  slug: z.string().min(2).max(40),
  displayName: z.string().min(2).max(80),
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(100),
  slotMinutes: z.number().int().min(10).max(120).optional(),
});

export async function POST(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 },
    );
  }

  if (!isValidSlug(parsed.data.slug)) {
    return NextResponse.json(
      { error: "כתובת לא תקינה (למשל: dani או dani-cohen)" },
      { status: 400 },
    );
  }

  try {
    const barber = await createBarber(parsed.data);
    return NextResponse.json({
      barber: {
        id: barber.id,
        slug: barber.slug,
        displayName: barber.displayName,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "לא ניתן ליצור ספר";
    if (message.includes("Unique") || message.includes("unique")) {
      return NextResponse.json(
        { error: "שם משתמש או כתובת כבר קיימים" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  smsPlanEnabled: z.boolean().optional(),
  customerCancelEnabled: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
  displayName: z.string().min(2).max(80).optional(),
  locale: z.enum(["he", "ar"]).optional(),
  smsQuota: z.number().int().min(0).optional(),
  smsRemaining: z.number().int().min(0).optional(),
  smsCreditsAdd: z.number().int().min(1).max(100_000).optional(),
});

export async function PATCH(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  if (parsed.data.password) {
    await resetBarberPassword(parsed.data.id, parsed.data.password);
  }

  if (parsed.data.smsCreditsAdd !== undefined) {
    await addBarberSmsCredits(parsed.data.id, parsed.data.smsCreditsAdd);
  } else if (parsed.data.smsQuota !== undefined) {
    await setBarberSmsQuota({
      barberId: parsed.data.id,
      quota: parsed.data.smsQuota,
      remaining: parsed.data.smsRemaining,
    });
  }

  const barber = await prisma.barber.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.smsPlanEnabled !== undefined
        ? { smsPlanEnabled: parsed.data.smsPlanEnabled }
        : {}),
      ...(parsed.data.customerCancelEnabled !== undefined
        ? { customerCancelEnabled: parsed.data.customerCancelEnabled }
        : {}),
      ...(parsed.data.displayName
        ? { displayName: parsed.data.displayName.trim() }
        : {}),
      ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
    },
  });

  return NextResponse.json({
    barber: {
      id: barber.id,
      slug: barber.slug,
      displayName: barber.displayName,
      isActive: barber.isActive,
      locale: barber.locale,
      smsPlanEnabled: barber.smsPlanEnabled,
      customerCancelEnabled: barber.customerCancelEnabled,
      smsQuota: barber.smsQuota,
      smsRemaining: barber.smsRemaining,
    },
  });
}
