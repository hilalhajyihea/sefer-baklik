import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  return {
    title: barber
      ? `ספר בקליק · כניסת מנהל · ${barber.displayName}`
      : "ספר בקליק · כניסת מנהל",
  };
}

export default async function BarberLoginPage({ params }: Props) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber || !barber.isActive) notFound();

  const session = await getSession();
  if (session?.kind === "barber" && session.slug === slug) {
    redirect(`/${slug}/admin`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <LoginForm
        endpoint="/api/auth/barber/login"
        title="כניסת מנהל"
        subtitle={`ניהול היומן של ${barber.displayName}`}
        redirectTo={`/${slug}/admin`}
      />
    </main>
  );
}
