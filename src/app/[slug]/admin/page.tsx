import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BarberAdminPanel } from "@/components/BarberAdminPanel";
import { requireBarberSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  return {
    title: barber
      ? `ספר בקליק · ניהול · ${barber.displayName}`
      : "ספר בקליק · ניהול",
  };
}

export default async function BarberAdminPage({ params }: Props) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber || !barber.isActive) notFound();

  const session = await requireBarberSession(slug);
  if (!session) redirect(`/${slug}/login`);

  return (
    <main className="flex-1">
      <BarberAdminPanel slug={barber.slug} displayName={barber.displayName} />
    </main>
  );
}
