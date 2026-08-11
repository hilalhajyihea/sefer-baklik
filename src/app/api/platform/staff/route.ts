import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffMember, countActiveStaff } from "@/lib/staff";

export async function GET(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const barberId = new URL(request.url).searchParams.get("barberId");
  if (!barberId) {
    return NextResponse.json({ error: "מזהה ספר חסר" }, { status: 400 });
  }

  const staff = await prisma.staff.findMany({
    where: { barberId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    staff,
    activeCount: staff.filter((s) => s.isActive).length,
  });
}

const createSchema = z.object({
  barberId: z.string().min(1),
  displayName: z.string().min(2).max(80),
});

export async function POST(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { id: parsed.data.barberId },
  });
  if (!barber) {
    return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
  }

  try {
    const staff = await createStaffMember({
      barberId: parsed.data.barberId,
      displayName: parsed.data.displayName,
    });
    const activeCount = await countActiveStaff(parsed.data.barberId);
    return NextResponse.json({ staff, activeCount, teamMode: activeCount >= 2 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "יצירה נכשלה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(2).max(80).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
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

  const existing = await prisma.staff.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "ספר צוות לא נמצא" }, { status: 404 });
  }

  if (parsed.data.isActive === false && existing.isActive) {
    const activeCount = await countActiveStaff(existing.barberId);
    if (activeCount <= 2) {
      const futureStaffAppts = await prisma.appointment.count({
        where: {
          barberId: existing.barberId,
          staffId: { not: null },
          status: "BOOKED",
          startsAt: { gt: new Date() },
        },
      });
      if (futureStaffAppts > 0) {
        return NextResponse.json(
          {
            error:
              "לא ניתן להשבית — נשארו פחות משני ספרים פעילים ויש תורים עתידיים משובצים לצוות",
          },
          { status: 409 },
        );
      }
    }
  }

  const staff = await prisma.staff.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.displayName
        ? { displayName: parsed.data.displayName.trim() }
        : {}),
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    },
  });

  const activeCount = await countActiveStaff(staff.barberId);
  return NextResponse.json({
    staff,
    activeCount,
    teamMode: activeCount >= 2,
  });
}
