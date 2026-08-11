import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
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
      ? `${t(locale, "brand")} · ${t(locale, "loginTitle")} · ${barber.displayName}`
      : `${t(locale, "brand")} · ${t(locale, "loginTitle")}`,
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

  const locale = normalizeLocale(barber.locale);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12" lang={locale}>
      <LoginForm
        endpoint="/api/auth/barber/login"
        title={t(locale, "loginTitle")}
        subtitle={t(locale, "loginSubtitle", { name: barber.displayName })}
        redirectTo={`/${slug}/admin`}
        locale={locale}
      />
    </main>
  );
}
