"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { Order, Product, Settings, StoreData } from "@/lib/types";

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/store", { cache: "no-store" });
    const data = (await res.json()) as StoreData & { error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to load reports");
      return;
    }
    setError(null);
    setOrders(data.orders);
    setProducts(data.products);
    setSettings(data.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const completed = useMemo(
    () => orders.filter((o) => o.status === "completed"),
    [orders],
  );

  const today = new Date().toDateString();
  const todayOrders = completed.filter(
    (o) => new Date(o.createdAt).toDateString() === today,
  );

  const totals = useMemo(() => {
    const base = todayOrders.reduce((s, o) => s + o.totalBase, 0);
    const cashThb = todayOrders
      .filter((o) => o.payment.method === "cash" && o.payment.currency === "THB")
      .reduce((s, o) => s + o.payment.amount, 0);
    const cashLak = todayOrders
      .filter((o) => o.payment.method === "cash" && o.payment.currency === "LAK")
      .reduce((s, o) => s + o.payment.amount, 0);
    const qrThb = todayOrders
      .filter((o) => o.payment.method === "qr" && o.payment.currency === "THB")
      .reduce((s, o) => s + o.payment.amount, 0);
    const qrLak = todayOrders
      .filter((o) => o.payment.method === "qr" && o.payment.currency === "LAK")
      .reduce((s, o) => s + o.payment.amount, 0);
    return { base, cashThb, cashLak, qrThb, qrLak };
  }, [todayOrders]);

  const lowStock = useMemo(() => {
    const rows: Array<{ name: string; sku: string; stock: number; low: number }> =
      [];
    for (const p of products) {
      for (const v of p.variants) {
        if (v.stock <= p.lowStockAt) {
          rows.push({
            name: [p.name, v.size, v.color].filter(Boolean).join(" · "),
            sku: v.sku,
            stock: v.stock,
            low: p.lowStockAt,
          });
        }
      }
    }
    return rows.sort((a, b) => a.stock - b.stock);
  }, [products]);

  async function voidSale(orderId: string) {
    if (!confirm("Void this sale and restore stock?")) return;
    setBusyId(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "void" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Void failed");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!settings) {
    return (
      <p className={error ? "text-[var(--danger)]" : "text-[var(--muted)]"}>
        {error ?? "Loading…"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-deep)]">
          Reports
        </h1>
        <p className="text-sm text-[var(--muted)]">Today’s sales · Cash vs QR · THB vs LAK</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Sales today (base)"
          value={formatMoney(totals.base, settings.baseCurrency)}
          hint={`${todayOrders.length} orders`}
        />
        <Stat
          label="Cash THB"
          value={formatMoney(totals.cashThb, "THB")}
        />
        <Stat
          label="Cash LAK"
          value={formatMoney(totals.cashLak, "LAK")}
        />
        <Stat label="QR THB" value={formatMoney(totals.qrThb, "THB")} />
        <Stat label="QR LAK" value={formatMoney(totals.qrLak, "LAK")} />
        <Stat
          label="FX in use"
          value={`1 THB = ${settings.lakPerThb} LAK`}
        />
      </div>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--brand-deep)]">
          Low stock
        </h2>
        {lowStock.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">All good.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--line)] text-sm">
            {lowStock.map((row) => (
              <li
                key={row.sku}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span>
                  {row.name}{" "}
                  <span className="text-[var(--muted)]">({row.sku})</span>
                </span>
                <span className="font-[family-name:var(--font-plex)] text-[var(--warn)]">
                  {row.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--brand-deep)]">
          Recent sales
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Paid</th>
                <th className="py-2 pr-3 font-medium">Base</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 30).map((o) => (
                <tr key={o.id} className="border-t border-[var(--line)]">
                  <td className="py-2 pr-3">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-[family-name:var(--font-plex)]">
                    {formatMoney(o.payment.amount, o.payment.currency)}{" "}
                    {o.payment.method.toUpperCase()}
                  </td>
                  <td className="py-2 pr-3 font-[family-name:var(--font-plex)]">
                    {formatMoney(o.totalBase, settings.baseCurrency)}
                  </td>
                  <td className="py-2 pr-3 capitalize">{o.status}</td>
                  <td className="py-2 text-right">
                    {o.status === "completed" && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void voidSale(o.id)}
                        className="text-[var(--danger)] underline disabled:opacity-50"
                      >
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-[var(--muted)]">
                    No sales yet — use the Sell screen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-plex)] text-xl font-medium text-[var(--brand-deep)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
