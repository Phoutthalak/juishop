import { NextResponse } from "next/server";
import { resetToSeed } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(resetToSeed());
}
