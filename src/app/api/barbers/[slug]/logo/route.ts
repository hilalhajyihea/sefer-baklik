import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      isActive: true,
      logoData: true,
      logoMimeType: true,
    },
  });

  if (!barber?.isActive || !barber.logoData || !barber.logoMimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = Buffer.from(barber.logoData);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": barber.logoMimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
