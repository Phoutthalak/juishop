import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listProducts, upsertProduct } from "@/lib/store";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listProducts());
  } catch (e) {
    return errorResponse(e, "Failed to load products");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Product;
    if (!body.id || !body.name || !body.type || body.price == null) {
      return NextResponse.json({ error: "Missing product fields" }, { status: 400 });
    }
    if (!body.variants?.length) {
      return NextResponse.json({ error: "At least one variant required" }, { status: 400 });
    }
    return NextResponse.json(await upsertProduct(body));
  } catch (e) {
    return errorResponse(e, "Failed to save product");
  }
}
