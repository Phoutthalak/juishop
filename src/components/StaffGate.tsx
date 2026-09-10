"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getStaffName, setStaffName } from "@/lib/staff";

export function StaffGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [staff, setStaff] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStaff(getStaffName());
    setReady(true);
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setStaffName(data.name);
      setStaff(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="p-8 text-[var(--muted)]">ກຳລັງໂຫຼດ…</p>;
  }

  if (!staff) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--brand-deep)]">
          AllNew Shop
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">ເຂົ້າສູ່ລະບົບກ່ອນຂາຍ</p>
        <form
          onSubmit={(e) => void login(e)}
          className="mt-6 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">ຊື່ພະນັກງານ</span>
            <input
              className="w-full min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">PIN (ຖ້າຕັ້ງໄວ້)</span>
            <input
              type="password"
              inputMode="numeric"
              className="w-full min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-lg bg-[var(--accent)] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "ກຳລັງເຂົ້າ…" : "ເຂົ້າສູ່ລະບົບ"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
