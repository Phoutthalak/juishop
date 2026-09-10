"use client";

import { useCallback, useEffect, useState } from "react";
import type { Currency, Settings } from "@/lib/types";

const inputClass =
  "w-full min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 outline-none focus:ring-2 focus:ring-[var(--brand)]";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [accessPin, setAccessPin] = useState("");
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
      const payload: Partial<Settings> = { ...settings };
      if (accessPin.trim()) payload.accessPin = accessPin.trim();
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data);
      setAccessPin("");
      setMessage("Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onQrFile(file: File) {
    if (!settings) return;
    if (file.size > 400_000) {
      setError("QR image must be under 400 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ ...settings, qrImage: String(reader.result) });
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function downloadBackup() {
    setError(null);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Backup failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
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
          <span className="mb-1 block text-[var(--muted)]">Staff PIN</span>
          <input
            type="password"
            inputMode="numeric"
            className={inputClass}
            value={accessPin}
            placeholder={settings.hasAccessPin ? "PIN is set — type to change" : "Set a PIN"}
            onChange={(e) => setAccessPin(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Bank QR image</span>
          <input
            type="file"
            accept="image/*"
            className="w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onQrFile(file);
            }}
          />
          {settings.qrImage && (
            <img
              src={settings.qrImage}
              alt="Shop QR"
              className="mt-2 h-32 w-32 rounded-md border border-[var(--line)] bg-white object-contain p-1"
            />
          )}
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
        onClick={() => void downloadBackup()}
        className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white text-sm"
      >
        Download backup
      </button>
    </div>
  );
}
