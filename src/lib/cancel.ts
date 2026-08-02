import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";

/**
 * 6 bytes → 8 base64url chars. Compact for SMS cost, still ~48 bits of entropy.
 */
export function generateCancelToken() {
  return randomBytes(6).toString("base64url");
}

export function buildCancelUrl(token: string) {
  return `${getSiteUrl()}/c/${token}`;
}

/**
 * SMS line for cancel. Keep the URL on its own ASCII-only line —
 * do NOT wrap with bidi marks (phones often include them in the opened URL).
 */
export function formatCancelSmsLine(cancelUrl: string) {
  return `לביטול התור:\n${cancelUrl}`;
}

/** Strip bidi / invisible chars phones may append when opening SMS links. */
export function sanitizeCancelToken(raw: string): string {
  let token = raw || "";
  try {
    token = decodeURIComponent(token);
  } catch {
    // keep raw
  }
  return token
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .trim();
}

/** Ensure appointment has a cancel token; backfill if missing (legacy rows). */
export async function ensureCancelToken(appointment: {
  id: string;
  cancelToken: string | null;
}): Promise<string> {
  if (appointment.cancelToken) return appointment.cancelToken;
  const token = generateCancelToken();
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { cancelToken: token },
  });
  return token;
}

export type CancelPageState =
  | "confirm"
  | "success"
  | "already_cancelled"
  | "cannot_cancel"
  | "invalid";

const appointmentInclude = {
  barber: {
    select: {
      displayName: true,
      slug: true,
      isActive: true,
      customerCancelEnabled: true,
    },
  },
} as const;

export async function findAppointmentByCancelToken(rawToken: string) {
  const token = sanitizeCancelToken(rawToken);
  if (!token || token.length < 6) return null;

  const exact = await prisma.appointment.findFirst({
    where: { cancelToken: token },
    include: appointmentInclude,
  });
  if (exact) return exact;

  // Fallback: SMS sometimes truncates the end of a long (legacy hex) token
  if (token.length >= 12) {
    return prisma.appointment.findFirst({
      where: { cancelToken: { startsWith: token } },
      include: appointmentInclude,
    });
  }

  return null;
}

export function resolveCancelState(appointment: {
  status: string;
  startsAt: Date;
  barber?: { customerCancelEnabled?: boolean };
} | null): CancelPageState {
  if (!appointment) return "invalid";
  if (appointment.barber && appointment.barber.customerCancelEnabled === false) {
    return "cannot_cancel";
  }
  if (appointment.status === "CANCELLED") return "already_cancelled";
  if (appointment.status !== "BOOKED") return "cannot_cancel";
  if (appointment.startsAt.getTime() <= Date.now()) return "cannot_cancel";
  return "confirm";
}

/** Cancel a BOOKED future appointment by public cancel token. Idempotent if already cancelled. */
export async function cancelAppointmentByToken(rawToken: string): Promise<{
  state: CancelPageState;
  appointment: Awaited<ReturnType<typeof findAppointmentByCancelToken>>;
}> {
  const appointment = await findAppointmentByCancelToken(rawToken);
  if (!appointment) {
    return { state: "invalid", appointment: null };
  }

  if (!appointment.barber.customerCancelEnabled) {
    return { state: "cannot_cancel", appointment };
  }

  if (appointment.status === "CANCELLED") {
    return { state: "already_cancelled", appointment };
  }

  if (appointment.status !== "BOOKED" || appointment.startsAt.getTime() <= Date.now()) {
    return { state: "cannot_cancel", appointment };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
    include: appointmentInclude,
  });

  return { state: "success", appointment: updated };
}
