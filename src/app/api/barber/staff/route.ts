import { NextResponse } from "next/server";
import { requireBarberSession } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getAllStaff, isTeamMode } from "@/lib/staff";

export async function GET() {
  const session = await requireBarberSession();
  if (!session) {
    return NextResponse.json({ error: t("he", "errUnauthorized") }, { status: 401 });
  }

  const [staff, teamMode] = await Promise.all([
    getAllStaff(session.barberId),
    isTeamMode(session.barberId),
  ]);

  return NextResponse.json({
    teamMode,
    staff: staff.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    })),
  });
}
