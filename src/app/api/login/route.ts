import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getSettings, verifyAccessPin } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; pin?: string };
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Staff name is required" }, { status: 400 });
    }
    const settings = await getSettings();
    if (!verifyAccessPin(settings, body.pin ?? "")) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, name });
  } catch (e) {
    return errorResponse(e, "Login failed");
  }
}
