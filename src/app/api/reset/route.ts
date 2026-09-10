import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { resetToSeed } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await resetToSeed());
  } catch (e) {
    return errorResponse(e, "Reset failed");
  }
}
