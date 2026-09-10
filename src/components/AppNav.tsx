"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ຂາຍ" },
  { href: "/products", label: "ສິນຄ້າ" },
  { href: "/reports", label: "ລາຍງານ" },
  { href: "/settings", label: "ການຕັ້ງຄ່າ" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
      <div>
        <p
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--brand-deep)] sm:text-3xl"
        >
          AllNew Shop
        </p>
        <p className="text-sm text-[var(--muted)]">ເສື້ອຜ້າ · ຂອງຂວັນ · ກ່ອງເປົ່າ · ເງິນສົດ & QR</p>
      </div>
      <nav className="flex flex-wrap gap-1">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition hover-lift ${active
                  ? "bg-[var(--brand)] text-white shadow-md"
                  : "text-[var(--ink)] hover:bg-[var(--bg-accent)]"
                }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
