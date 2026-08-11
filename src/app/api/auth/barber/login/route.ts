import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateBarber } from "@/lib/barbers";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: t("he", "errInvalidData") },
        { status: 400 },
      );
    }

    const existing = await prisma.barber.findUnique({
      where: { username: parsed.data.username },
      select: { locale: true },
    });
    const locale = normalizeLocale(existing?.locale);

    const barber = await authenticateBarber(
      parsed.data.username,
      parsed.data.password,
    );
    if (!barber) {
      return NextResponse.json(
        { error: t(locale, "errBadCredentials") },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      kind: "barber",
      barberId: barber.id,
      username: barber.username,
      displayName: barber.displayName,
      slug: barber.slug,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      barber: {
        id: barber.id,
        slug: barber.slug,
        displayName: barber.displayName,
      },
    });
  } catch (error) {
    console.error("barber login error", error);
    return NextResponse.json({ error: t("he", "errServer") }, { status: 500 });
  }
}
