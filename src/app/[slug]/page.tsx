import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingCalendar } from "@/components/BookingCalendar";
import { prisma } from "@/lib/prisma";
import { barberShareMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber || !barber.isActive) {
    return { title: "ספר בקליק" };
  }
  return barberShareMetadata(barber.displayName, barber.slug);
}

export default async function BarberPublicPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "platform" || slug === "api" || slug === "cancel") notFound();

  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber || !barber.isActive) notFound();

  return (
    <main className="flex-1">
      <BookingCalendar slug={barber.slug} displayName={barber.displayName} />
    </main>
  );
}
