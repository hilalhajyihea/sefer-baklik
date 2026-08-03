import { NextResponse } from "next/server";
import { sms019ConfigStatus } from "@/lib/sms";

/** Safe status check — does not expose secrets. */
export async function GET() {
  return NextResponse.json(sms019ConfigStatus());
}
