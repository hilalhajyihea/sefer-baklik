import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";

export function generateCancelToken() {
  return randomBytes(24).toString("hex");
}

export function buildCancelUrl(token: string) {
  return `${getSiteUrl()}/cancel/${token}`;
}

/** Wrap URL so RTL SMS clients don't mangle / truncate the link. */
export function formatCancelSmsLine(cancelUrl: string) {
  // LTR embedding: isolate the URL from surrounding Hebrew
  return `לביטול:\n\u2066${cancelUrl}\u2069`;
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

export function resolveCancelState(appointment: {
  status: string;
  startsAt: Date;
} | null): CancelPageState {
  if (!appointment) return "invalid";
  if (appointment.status === "CANCELLED") return "already_cancelled";
  if (appointment.status !== "BOOKED") return "cannot_cancel";
  if (appointment.startsAt.getTime() <= Date.now()) return "cannot_cancel";
  return "confirm";
}

export async function findAppointmentByCancelToken(token: string) {
  return prisma.appointment.findFirst({
    where: { cancelToken: token },
    include: {
      barber: { select: { displayName: true, slug: true, isActive: true } },
    },
  });
}

/** Cancel a BOOKED future appointment by public cancel token. Idempotent if already cancelled. */
export async function cancelAppointmentByToken(token: string): Promise<{
  state: CancelPageState;
  appointment: Awaited<ReturnType<typeof findAppointmentByCancelToken>>;
}> {
  const appointment = await findAppointmentByCancelToken(token);
  if (!appointment) {
    return { state: "invalid", appointment: null };
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
    include: {
      barber: { select: { displayName: true, slug: true, isActive: true } },
    },
  });

  return { state: "success", appointment: updated };
}
