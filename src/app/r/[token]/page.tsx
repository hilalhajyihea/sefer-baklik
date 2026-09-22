import type { Metadata } from "next";
import { ConfirmTokenPage } from "@/components/ConfirmTokenPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "تأكيد الموعد",
  robots: { index: false, follow: false },
};

export default async function ConfirmAppointmentPage({ params }: Props) {
  const { token } = await params;
  return <ConfirmTokenPage rawToken={token} />;
}
