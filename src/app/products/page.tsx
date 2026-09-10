"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { Product, ProductType, Settings, Variant } from "@/lib/types";

const inputClass =
  "w-full min-h-10 rounded-lg border border-[var(--line)] bg-white px-2.5 outline-none focus:ring-2 focus:ring-[var(--brand)]";

const emptyForm = (): Product => ({
  id: `p-${Date.now().toString(36)}`,
  name: "",
  type: "gift",
  price: 0,
  cost: 0,
  lowStockAt: 5,
  active: true,
  variants: [{ id: `v-${Date.now().toString(36)}`, sku: "", stock: 0 }],
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    const productsBody = await pRes.json();
    const settingsBody = await sRes.json();
    if (!pRes.ok || !sRes.ok) {
      setError(productsBody.error || settingsBody.error || "Failed to load products");
      return;
    }
    setError(null);
    setProducts(productsBody);
    setSettings(settingsBody);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateVariant(idx: number, patch: Partial<Variant>) {
    if (!editing) return;
    const variants = editing.variants.map((v, i) =>
      i === idx ? { ...v, ...patch } : v,
    );
    setEditing({ ...editing, variants });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-deep)]">
            Products
          </h1>
          <p className="text-sm text-[var(--muted)]">
            One price in {settings?.baseCurrency ?? "base"} · clothes use size/color
            variants · boxes are empty boxes for sale
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(emptyForm())}
          className="min-h-11 rounded-lg bg-[var(--brand)] px-4 font-medium text-white"
        >
          Add product
        </button>
      </div>

      {error && !editing && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--bg-accent)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 capitalize text-[var(--muted)]">{p.type}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-plex)]">
                    {settings
                      ? formatMoney(p.price, settings.baseCurrency)
                      : p.price}
                  </td>
                  <td
                    className={`px-3 py-2 font-[family-name:var(--font-plex)] ${
                      stock <= p.lowStockAt ? "text-[var(--warn)]" : ""
                    }`}
                  >
                    {stock}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-[var(--brand)] underline"
                      onClick={() => setEditing(structuredClone(p))}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-[var(--surface)] p-4 shadow-xl">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--brand-deep)]">
              {editing.name ? "Edit product" : "New product"}
            </h2>
            <div className="mt-3 grid gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Name</span>
                <input
                  className={inputClass}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Type</span>
                  <select
                    className={inputClass}
                    value={editing.type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        type: e.target.value as ProductType,
                      })
                    }
                  >
                    <option value="clothes">Clothes</option>
                    <option value="gift">Gift</option>
                    <option value="box">Box (empty)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">
                    Price ({settings?.baseCurrency ?? ""})
                  </span>
                  <input
                    type="number"
                    className={inputClass}
                    value={editing.price}
                    onChange={(e) =>
                      setEditing({ ...editing, price: Number(e.target.value) || 0 })
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">
                    Cost ({settings?.baseCurrency ?? ""})
                  </span>
                  <input
                    type="number"
                    className={inputClass}
                    value={editing.cost}
                    onChange={(e) =>
                      setEditing({ ...editing, cost: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Low stock at</span>
                  <input
                    type="number"
                    className={inputClass}
                    value={editing.lowStockAt}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        lowStockAt: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--muted)]">Barcode (optional)</span>
                <input
                  className={inputClass}
                  value={editing.barcode ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, barcode: e.target.value || undefined })
                  }
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Variants / SKUs</p>
                  <button
                    type="button"
                    className="text-sm text-[var(--brand)] underline"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        variants: [
                          ...editing.variants,
                          {
                            id: `v-${Date.now().toString(36)}`,
                            sku: "",
                            stock: 0,
                            size: editing.type === "clothes" ? "M" : undefined,
                            color: editing.type === "clothes" ? "" : undefined,
                          },
                        ],
                      })
                    }
                  >
                    Add variant
                  </button>
                </div>
                <div className="space-y-2">
                  {editing.variants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] p-2 sm:grid-cols-5"
                    >
                      <input
                        placeholder="SKU"
                        className={inputClass}
                        value={v.sku}
                        onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                      />
                      <input
                        placeholder="Size"
                        className={inputClass}
                        value={v.size ?? ""}
                        onChange={(e) =>
                          updateVariant(idx, { size: e.target.value || undefined })
                        }
                      />
                      <input
                        placeholder="Color"
                        className={inputClass}
                        value={v.color ?? ""}
                        onChange={(e) =>
                          updateVariant(idx, { color: e.target.value || undefined })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        className={inputClass}
                        value={v.stock}
                        onChange={(e) =>
                          updateVariant(idx, { stock: Number(e.target.value) || 0 })
                        }
                      />
                      <button
                        type="button"
                        className="text-sm text-[var(--danger)]"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            variants: editing.variants.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                Active (sellable)
              </label>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="min-h-11 flex-1 rounded-lg bg-[var(--bg-accent)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="min-h-11 flex-1 rounded-lg bg-[var(--accent)] font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
