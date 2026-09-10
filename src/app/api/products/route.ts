import { NextResponse } from "next/server";
import { listProducts, upsertProduct } from "@/lib/store";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listProducts());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Product;
  if (!body.id || !body.name || !body.type || body.price == null) {
    return NextResponse.json({ error: "Missing product fields" }, { status: 400 });
  }
  if (!body.variants?.length) {
    return NextResponse.json({ error: "At least one variant required" }, { status: 400 });
  }
  return NextResponse.json(upsertProduct(body));
}
