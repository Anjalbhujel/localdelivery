"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  name: string;
  onSignOut: () => void;
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deliveries", label: "My deliveries" },
];

export default function AppHeader({ name, onSignOut }: Props) {
  const pathname = usePathname();
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-slate-900">SwiftRoute</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
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

        <div className="flex items-center gap-3">
          <Link
            href="/deliveries/new"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Post a delivery
          </Link>
          <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white sm:flex">
            {initial}
          </span>
          <button
            onClick={onSignOut}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}