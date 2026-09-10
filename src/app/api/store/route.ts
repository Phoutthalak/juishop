import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getStore, toPublicStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStore();
    return NextResponse.json(toPublicStore(store));
  } catch (e) {
    return errorResponse(e, "Failed to load store");
  }
}
