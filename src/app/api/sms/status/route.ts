import { NextResponse } from "next/server";
import { twilioConfigStatus } from "@/lib/sms";

/** Safe status check — does not expose secrets. */
export async function GET() {
  return NextResponse.json(twilioConfigStatus());
}
