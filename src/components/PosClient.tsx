"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { convertFromBase, formatMoney } from "@/lib/money";
import { getStaffName } from "@/lib/staff";
import type {
  Currency,
  Order,
  PayMethod,
  Product,
  ProductType,
  Settings,
  StoreData,
  Variant,
} from "@/lib/types";

type CartLine = {
  key: string;
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  qty: number;
  unitPriceBase: number;
  maxStock: number;
};

const filters: Array<{ id: "all" | ProductType; label: string }> = [
  { id: "all", label: "ທັງໝົດ" },
  { id: "clothes", label: "ເສື້ອຜ້າ" },
  { id: "gift", label: "ຂອງຂວັນ" },
  { id: "box", label: "ກ່ອງ" },
];

export function PosClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<"all" | ProductType>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountBase, setDiscountBase] = useState(0);
  const [picker, setPicker] = useState<Product | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payCurrency, setPayCurrency] = useState<Currency>("LAK");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/store", { cache: "no-store" });
    const data = (await res.json()) as StoreData & { error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to load store");
      return;
    }
    setError(null);
    setSettings(data.settings);
    setProducts(data.products.filter((p) => p.active));
    setPayCurrency(data.settings.baseCurrency);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "all" && p.type !== filter) return false;
      if (!q) return true;
      const inName = p.name.toLowerCase().includes(q);
      const inBarcode = p.barcode?.toLowerCase().includes(q);
      const inSku = p.variants.some((v) => v.sku.toLowerCase().includes(q));
      return inName || inBarcode || inSku;
    });
  }, [products, filter, query]);

  const subtotalBase = cart.reduce((s, l) => s + l.unitPriceBase * l.qty, 0);
  const totalBase = Math.max(0, subtotalBase - discountBase);

  function stockTotal(p: Product) {
    return p.variants.reduce((s, v) => s + v.stock, 0);
  }

  function addVariant(product: Product, variant: Variant) {
    if (variant.stock <= 0) {
      setError("ສິນຄ້າໝົດ");
      return;
    }
    setError(null);
    setCart((prev) => {
      const key = `${product.id}:${variant.id}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        if (existing.qty >= variant.stock) {
          setError("ສິນຄ້າບໍ່ພຽງພໍ");
          return prev;
        }
        return prev.map((l) =>
          l.key === key ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      const label = [product.name, variant.size, variant.color]
        .filter(Boolean)
        .join(" · ");
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: variant.id,
          name: label,
          sku: variant.sku,
          qty: 1,
          unitPriceBase: product.price,
          maxStock: variant.stock,
        },
      ];
    });
    setPicker(null);
  }

  function onProductTap(product: Product) {
    if (product.type === "clothes" && product.variants.length > 1) {
      setPicker(product);
      return;
    }
    const variant = product.variants[0];
    if (!variant) {
      setError("ບໍ່ມີລາຍການຍ່ອຍ");
      return;
    }
    addVariant(product, variant);
  }

  function setQty(key: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const next = Math.min(l.maxStock, Math.max(0, qty));
          return { ...l, qty: next };
        })
        .filter((l) => l.qty > 0),
    );
  }

  async function confirmPay() {
    if (!settings || cart.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
          })),
          discountBase,
          method: payMethod,
          currency: payCurrency,
          cashier: getStaffName(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ການຊຳລະເງິນລົ້ມເຫຼວ");
      setLastOrder(data as Order);
      setCart([]);
      setDiscountBase(0);
      setPayOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ການຊຳລະເງິນລົ້ມເຫຼວ");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-8 text-[var(--muted)]">
        {error ? (
          <p className="text-[var(--danger)]">{error}</p>
        ) : (
          "ກຳລັງໂຫຼດ POS…"
        )}
      </div>
    );
  }

  const totalDisplay = convertFromBase(totalBase, payCurrency, settings);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/90 p-3 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ຄົ້ນຫາຊື່, SKU, ບາໂຄດ…"
            className="min-h-11 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 outline-none ring-[var(--brand)] focus:ring-2"
          />
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                  filter === f.id
                    ? "bg-[var(--brand-deep)] text-white"
                    : "bg-[var(--bg-accent)] text-[var(--ink)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid max-h-[70dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => {
            const stock = stockTotal(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onProductTap(p)}
                className="flex min-h-[7.5rem] flex-col items-start justify-between rounded-lg border border-[var(--line)] bg-white p-3 text-left transition hover-lift hover:border-[var(--brand)] active:scale-[0.99]"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {p.type}
                  </span>
                  <p className="mt-1 font-medium leading-snug">{p.name}</p>
                </div>
                <div className="mt-2 w-full">
                  <p className="font-[family-name:var(--font-plex)] text-sm font-medium text-[var(--brand-deep)]">
                    {formatMoney(p.price, settings.baseCurrency)}
                  </p>
                  <p
                    className={`text-xs ${stock <= p.lowStockAt ? "text-[var(--warn)]" : "text-[var(--muted)]"}`}
                  >
                    ສິນຄ້າໃນສາງ {stock}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--brand-deep)] p-3 text-white shadow-sm">
        <h2 className="font-[family-name:var(--font-display)] text-xl">ກະຕ່າ</h2>
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
          {cart.length === 0 && (
            <p className="text-sm text-white/70">ແຕະສິນຄ້າເພື່ອເພີ່ມເຂົ້າກະຕ່າ.</p>
          )}
          {cart.map((line) => (
            <div
              key={line.key}
              className="rounded-lg bg-white/10 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-white/60">{line.sku}</p>
                </div>
                <p className="font-[family-name:var(--font-plex)] text-sm">
                  {formatMoney(line.unitPriceBase * line.qty, settings.baseCurrency)}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 w-9 rounded-md bg-white/15"
                  onClick={() => setQty(line.key, line.qty - 1)}
                >
                  −
                </button>
                <span className="font-[family-name:var(--font-plex)] w-8 text-center">
                  {line.qty}
                </span>
                <button
                  type="button"
                  className="h-9 w-9 rounded-md bg-white/15"
                  onClick={() => setQty(line.key, line.qty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-auto text-xs text-white/70 underline animate-pop"
                  onClick={() => setQty(line.key, 0)}
                >
                  ລຶບ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 border-t border-white/15 pt-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-white/80">ສ່ວນຫຼຸດ ({settings.baseCurrency})</span>
            <input
              type="number"
              min={0}
              value={discountBase || ""}
              onChange={(e) => setDiscountBase(Number(e.target.value) || 0)}
              className="w-28 rounded-md border-0 bg-white/15 px-2 py-1 text-right font-[family-name:var(--font-plex)] outline-none"
            />
          </label>
          <div className="flex justify-between text-sm text-white/80">
            <span>ລວມ</span>
            <span className="font-[family-name:var(--font-plex)]">
              {formatMoney(subtotalBase, settings.baseCurrency)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>ລວມທັງໝົດ</span>
            <span className="font-[family-name:var(--font-plex)]">
              {formatMoney(totalBase, settings.baseCurrency)}
            </span>
          </div>
          <p className="text-xs text-white/60">
            ≈ {formatMoney(convertFromBase(totalBase, settings.baseCurrency === "LAK" ? "THB" : "LAK", settings), settings.baseCurrency === "LAK" ? "THB" : "LAK")}
            {" · "}1 THB = {settings.lakPerThb} LAK
          </p>
          {error && <p className="text-sm text-[#ffb4a8]">{error}</p>}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              setPayOpen(true);
              setError(null);
            }}
            className="min-h-12 w-full rounded-lg bg-[var(--accent)] text-base font-semibold text-white disabled:opacity-40 animate-pop hover-lift"
          >
            ຈ່າຍເງິນ · ເງິນສົດ ຫຼື QR
          </button>
        </div>
      </aside>

      {picker && (
        <Modal title={`${picker.name} — ຂະໜາດ / ສີ`} onClose={() => setPicker(null)}>
          <div className="grid gap-2 sm:grid-cols-2">
            {picker.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                onClick={() => addVariant(picker, v)}
                className="rounded-lg border border-[var(--line)] bg-white p-3 text-left disabled:opacity-40"
              >
                <p className="font-medium">
                  {[v.size, v.color].filter(Boolean).join(" · ") || v.sku}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {v.sku} · ສິນຄ້າໃນສາງ {v.stock}
                </p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {payOpen && (
        <Modal title="ຮັບຊຳລະເງິນ" onClose={() => !busy && setPayOpen(false)}>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">ສະກຸນເງິນ</p>
              <div className="grid grid-cols-2 gap-2">
                {(["LAK", "THB"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPayCurrency(c)}
                    className={`min-h-11 rounded-lg font-medium ${
                      payCurrency === c
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--bg-accent)]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">ວິທີຈ່າຍເງິນ</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["cash", "ເງິນສົດ"],
                  ["qr", "QR"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPayMethod(id)}
                    className={`min-h-11 rounded-lg font-medium ${
                      payMethod === id
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--bg-accent)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg)] p-4 text-center">
              <p className="text-sm text-[var(--muted)]">ຍອດເງິນທີ່ຕ້ອງຊຳລະ</p>
              <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--brand-deep)]">
                {formatMoney(convertFromBase(totalBase, payCurrency, settings), payCurrency)}
              </p>
              {payMethod === "qr" && (
                <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
                  <p className="font-medium text-[var(--ink)]">ຈ່າຍຜ່ານ QR</p>
                  {settings.qrImage ? (
                    <img
                      src={settings.qrImage}
                      alt="Bank QR"
                      className="mx-auto mt-3 h-48 w-48 object-contain"
                    />
                  ) : (
                    <p className="mt-2 text-xs">Add your bank QR in Settings.</p>
                  )}
                  <p className="mt-2">{settings.qrNote}</p>
                  <p className="mt-2 font-[family-name:var(--font-plex)] text-lg text-[var(--ink)]">
                    {formatMoney(totalDisplay, payCurrency)}
                  </p>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmPay()}
              className="min-h-12 w-full rounded-lg bg-[var(--accent)] font-semibold text-white disabled:opacity-50 animate-pop hover-lift"
            >
              {busy ? "ກຳລັງບັນທຶກ…" : payMethod === "qr" ? "ຢືນຢັນການຈ່າຍ" : "ຢືນຢັນເງິນສົດ"}
            </button>
          </div>
        </Modal>
      )}

      {lastOrder && (
        <Modal title="ການຂາຍສຳເລັດ" onClose={() => setLastOrder(null)}>
          <div className="receipt-print">
            <Receipt order={lastOrder} settings={settings} />
          </div>
          <div className="mt-4 flex gap-2 print:hidden">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg border border-[var(--line)]"
              onClick={() => window.print()}
            >
              ພິມໃບບິນ
            </button>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg bg-[var(--brand)] text-white animate-pop hover-lift"
              onClick={() => setLastOrder(null)}
            >
              ຂາຍໃໝ່
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center print:static print:bg-transparent print:p-0">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--surface)] p-4 shadow-xl print:max-h-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
          <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--brand-deep)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-[var(--bg-accent)]"
          >
            ປິດ
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Receipt({ order, settings }: { order: Order; settings: Settings }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm">
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
        {settings.shopName}
      </p>
      <p className="text-[var(--muted)]">
        {new Date(order.createdAt).toLocaleString()} · {order.id}
        {order.cashier ? ` · ${order.cashier}` : ""}
      </p>
      <ul className="mt-3 space-y-1 border-y border-[var(--line)] py-3">
        {order.items.map((item) => (
          <li key={`${item.variantId}-${item.sku}`} className="flex justify-between gap-2">
            <span>
              {item.qty}× {item.name}
            </span>
            <span className="font-[family-name:var(--font-plex)]">
              {formatMoney(item.lineTotalBase, settings.baseCurrency)}
            </span>
          </li>
        ))}
      </ul>
      {order.discountBase > 0 && (
        <p className="mt-2 flex justify-between">
          <span>ສ່ວນຫຼຸດ</span>
          <span className="font-[family-name:var(--font-plex)]">
            −{formatMoney(order.discountBase, settings.baseCurrency)}
          </span>
        </p>
      )}
      <p className="mt-2 flex justify-between text-base font-semibold">
        <span>ຈ່າຍແລ້ວ</span>
        <span className="font-[family-name:var(--font-plex)]">
          {formatMoney(order.payment.amount, order.payment.currency)}{" "}
          {order.payment.method.toUpperCase()}
        </span>
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        ອັດຕາແລກປ່ຽນ: 1 THB = {order.fxRateUsed} LAK · ລວມເງິນຕົ້ນທາງ{" "}
        {formatMoney(order.totalBase, settings.baseCurrency)}
      </p>
      <p className="mt-3 text-[var(--muted)]">{settings.receiptFooter}</p>
    </div>
  );
}
