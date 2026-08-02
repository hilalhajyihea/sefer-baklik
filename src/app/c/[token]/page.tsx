import type { Metadata } from "next";
import { CancelTokenPage } from "@/components/CancelTokenPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "ביטול תור",
  robots: { index: false, follow: false },
};

export default async function ShortCancelAppointmentPage({ params }: Props) {
  const { token } = await params;
  return <CancelTokenPage rawToken={token} />;
}
