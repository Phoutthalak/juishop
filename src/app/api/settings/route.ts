import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<Settings>;
  if (body.lakPerThb !== undefined && body.lakPerThb <= 0) {
    return NextResponse.json({ error: "FX rate must be positive" }, { status: 400 });
  }
  return NextResponse.json(updateSettings(body));
}
