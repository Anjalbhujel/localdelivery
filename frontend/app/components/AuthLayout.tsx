import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  active: "login" | "signup";
  title: string;
  subtitle: string;
  children: ReactNode;
};

const features = [
  { title: "Post a delivery", text: "Pickup, package, drop-off" },
  { title: "Pick your trips", text: "Distance and payout upfront" },
  { title: "Live tracking", text: "Every stage timestamped" },
  { title: "Clear earnings", text: "Paid on delivery" },
];

export default function AuthLayout({ active, title, subtitle, children }: Props) {
  const tabClass = (isActive: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold text-slate-900">SwiftRoute</span>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to site
        </Link>
      </header>

      <div className="flex flex-1">
        <aside className="hidden flex-1 flex-col justify-between bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-12 text-white lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
              SwiftRoute accounts
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              One account.
              <br />
              Two ways to move.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Customers post a package in under a minute. Riders pick the trips
              that fit their route and see the exact payout before accepting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-slate-300">{f.text}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="inline-flex rounded-full border border-stone-200 bg-white p-1">
              <Link href="/login" className={tabClass(active === "login")}>
                Sign in
              </Link>
              <Link href="/signup" className={tabClass(active === "signup")}>
                Create account
              </Link>
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}