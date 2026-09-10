"use client";

import { useCallback, useEffect, useState } from "react";
import type { Currency, Settings } from "@/lib/types";

const inputClass =
  "w-full min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 outline-none focus:ring-2 focus:ring-[var(--brand)]";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load settings");
      return;
    }
    setSettings(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data);
      setMessage("Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetDemo() {
    if (!confirm("Reset products, stock, and sales to demo data?")) return;
    await fetch("/api/reset", { method: "POST" });
    await load();
    setMessage("Demo data restored");
  }

  if (!settings) {
    return (
      <p className={error ? "text-[var(--danger)]" : "text-[var(--muted)]"}>
        {error ?? "Loading…"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-deep)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          One product price in base currency · convert with FX · Cash & QR only
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Shop name</span>
          <input
            className={inputClass}
            value={settings.shopName}
            onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Base currency (prices)</span>
          <select
            className={inputClass}
            value={settings.baseCurrency}
            onChange={(e) =>
              setSettings({
                ...settings,
                baseCurrency: e.target.value as Currency,
              })
            }
          >
            <option value="LAK">LAK</option>
            <option value="THB">THB</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Exchange rate — LAK per 1 THB</span>
          <input
            type="number"
            className={inputClass}
            value={settings.lakPerThb}
            onChange={(e) =>
              setSettings({
                ...settings,
                lakPerThb: Number(e.target.value) || 0,
              })
            }
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Example: 550 means 1 THB = 550 LAK
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">QR payment note</span>
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={settings.qrNote}
            onChange={(e) => setSettings({ ...settings, qrNote: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Receipt footer</span>
          <input
            className={inputClass}
            value={settings.receiptFooter}
            onChange={(e) =>
              setSettings({ ...settings, receiptFooter: e.target.value })
            }
          />
        </label>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {message && <p className="text-sm text-[var(--ok)]">{message}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-11 w-full rounded-lg bg-[var(--accent)] font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void resetDemo()}
        className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--muted)]"
      >
        Reset demo catalog & sales
      </button>
    </div>
  );
}
