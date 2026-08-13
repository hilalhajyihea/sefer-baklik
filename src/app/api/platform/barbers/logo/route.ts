import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoApiUrl, readLogoUpload } from "@/lib/barberLogo";

export async function POST(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const form = await request.formData();
  const barberId = String(form.get("barberId") || "");
  const file = form.get("file");

  if (!barberId) {
    return NextResponse.json({ error: "מזהה ספר חסר" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא נבחר קובץ לוגו" }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!barber) {
    return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
  }

  try {
    const { data, mimeType } = await readLogoUpload(file);
    const logoUrl = logoApiUrl(barber.slug);
    const updated = await prisma.barber.update({
      where: { id: barber.id },
      data: {
        logoData: data,
        logoMimeType: mimeType,
        logoUrl,
      },
      select: { id: true, slug: true, displayName: true, logoUrl: true },
    });
    return NextResponse.json({ barber: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "העלאת הלוגו נכשלה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const barberId = String(body.id || "");
  if (!barberId) {
    return NextResponse.json({ error: "מזהה ספר חסר" }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { id: true, displayName: true, slug: true },
  });
  if (!barber) {
    return NextResponse.json({ error: "ספר לא נמצא" }, { status: 404 });
  }

  const updated = await prisma.barber.update({
    where: { id: barber.id },
    data: {
      logoUrl: null,
      logoData: null,
      logoMimeType: null,
    },
    select: { id: true, slug: true, displayName: true, logoUrl: true },
  });

  return NextResponse.json({ barber: updated });
}
