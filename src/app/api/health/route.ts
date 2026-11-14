import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Cheap check that the deployment is alive. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
