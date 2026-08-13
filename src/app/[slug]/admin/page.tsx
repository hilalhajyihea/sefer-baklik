import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BarberAdminPanel } from "@/components/BarberAdminPanel";
import { requireBarberSession } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  const locale = normalizeLocale(barber?.locale);
  return {
    title: barber
      ? `${t(locale, "brand")} · ${barber.displayName}`
      : t(locale, "brand"),
  };
}

export default async function BarberAdminPage({ params }: Props) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber || !barber.isActive) notFound();

  const session = await requireBarberSession(slug);
  if (!session) redirect(`/${slug}/login`);

  const locale = normalizeLocale(barber.locale);

  return (
    <main className="shop-shell flex-1" lang={locale}>
      <BarberAdminPanel
        slug={barber.slug}
        displayName={barber.displayName}
        locale={locale}
      />
    </main>
  );
}
