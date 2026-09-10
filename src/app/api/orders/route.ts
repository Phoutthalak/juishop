import { NextResponse } from "next/server";
import { createSale, listOrders, voidOrder } from "@/lib/store";
import type { CartLineInput, Currency, PayMethod } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listOrders());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lines: CartLineInput[];
      discountBase?: number;
      method: PayMethod;
      currency: Currency;
      note?: string;
    };
    if (body.method !== "cash" && body.method !== "qr") {
      return NextResponse.json({ error: "Payment must be cash or qr" }, { status: 400 });
    }
    if (body.currency !== "THB" && body.currency !== "LAK") {
      return NextResponse.json({ error: "Currency must be THB or LAK" }, { status: 400 });
    }
    const order = createSale(body);
    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { orderId: string; action: "void" };
    if (body.action !== "void" || !body.orderId) {
      return NextResponse.json({ error: "Invalid void request" }, { status: 400 });
    }
    return NextResponse.json(voidOrder(body.orderId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Void failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
