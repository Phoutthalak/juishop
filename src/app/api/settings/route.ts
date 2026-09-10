import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (e) {
    return errorResponse(e, "Failed to load settings");
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<Settings>;
    if (body.lakPerThb !== undefined && body.lakPerThb <= 0) {
      return NextResponse.json({ error: "FX rate must be positive" }, { status: 400 });
    }
    return NextResponse.json(await updateSettings(body));
  } catch (e) {
    return errorResponse(e, "Failed to save settings");
  }
}
