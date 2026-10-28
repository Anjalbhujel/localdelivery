"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Role = "customer" | "rider";
type NavLink = { href: string; label: string; exclude?: string };

type Props = {
  name: string;
  onSignOut: () => void;
  role?: Role;
  details?: { label: string; value: string }[];
};

const NAV: Record<Role, NavLink[]> = {
  customer: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/deliveries", label: "My deliveries", exclude: "/deliveries/new" },
  ],
    rider: [
    { href: "/board", label: "Order board" },
    { href: "/deliveries", label: "My deliveries" },
    { href: "/dashboard", label: "Dashboard" },
  ],
};

export default function AppHeader({
  name,
  onSignOut,
  role = "customer",
  details = [],
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstName = name.trim().split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 justify-self-start">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold text-slate-900">SwiftRoute</span>
        </Link>

        <div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV[role].map((link) => {
              const active =
                (pathname === link.href || pathname.startsWith(`${link.href}/`)) &&
                !(link.exclude && pathname.startsWith(link.exclude));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-stone-100 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center justify-end gap-3">
          {role === "customer" && (
            <Link
              href="/deliveries/new"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Post a delivery
            </Link>
          )}

          {role === "rider" && (
            <Link
              href="/board"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Find deliveries
            </Link>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-900 transition hover:bg-stone-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initial}
              </span>
              <span className="hidden sm:inline">{firstName}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <p className="text-xs capitalize text-slate-500">{role} account</p>

                {details.length > 0 && (
                  <dl className="mt-3 space-y-2 border-t border-stone-200 pt-3 text-sm">
                    {details.map((row) => (
                      <div key={row.label} className="flex justify-between gap-4">
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd className="truncate font-medium text-slate-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}