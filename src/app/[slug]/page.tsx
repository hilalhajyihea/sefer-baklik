import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingCalendar } from "@/components/BookingCalendar";
import { prisma } from "@/lib/prisma";
import { normalizeLocale } from "@/lib/i18n";
import { barberShareMetadata } from "@/lib/seo";
import { getActiveStaff, isTeamMode } from "@/lib/staff";

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
  if (slug === "platform" || slug === "api" || slug === "cancel" || slug === "c") {
    notFound();
  }

  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      isActive: true,
      locale: true,
      logoUrl: true,
      logoMimeType: true,
    },
  });
  if (!barber || !barber.isActive) notFound();

  const locale = normalizeLocale(barber.locale);
  const teamMode = await isTeamMode(barber.id);
  const staff = teamMode ? await getActiveStaff(barber.id) : [];
  const logoUrl = barber.logoMimeType
    ? barber.logoUrl || `/api/barbers/${barber.slug}/logo`
    : null;

  return (
    <main className="flex-1" lang={locale}>
      <BookingCalendar
        slug={barber.slug}
        displayName={barber.displayName}
        logoUrl={logoUrl}
        locale={locale}
        staff={staff}
      />
    </main>
  );
}
