"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import RiderDashboard from "./RiderDashboard";
import { StatCard, Svg } from "../components/StatCard";
import DeliveryRow, { Delivery, OPEN_STATUSES } from "../components/DeliveryRow";
import { cancelDeliveryRequest, fetchDeliveries } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type User = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  account_status: string;
  created_at: string;
};

type Stats = {
  posted: number;
  on_the_way: number;
  delivered: number;
  total_spend: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [statsData, setStatsData] = useState<Stats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/auth/me`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data: User) => setUser(data))
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/login");
      });

    fetch(`${API_URL}/deliveries/stats`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Stats | null) => setStatsData(data));

    fetch(`${API_URL}/deliveries`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Delivery[]) => setDeliveries(data));
  }, [router]);

  function handleSignOut() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

    async function cancelDelivery(id: number): Promise<string | null> {
    const result = await cancelDeliveryRequest(id);

    if (result.ok) {
      setDeliveries(
        (prev) =>
          prev && prev.map((d) => (d.id === id ? { ...d, status: result.status } : d))
      );
      return null;
    }

    if (result.unauthorized) {
      localStorage.removeItem("token");
      router.replace("/login");
      return null;
    }

    const latest = await fetchDeliveries();
    if (latest) setDeliveries(latest);
    return result.message;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (user.role === "rider") {
    return <RiderDashboard user={user} onSignOut={handleSignOut} />;
  }

  const firstName = user.full_name.trim().split(" ")[0];
  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  const stats = {
    posted: statsData?.posted ?? 0,
    onTheWay: statsData?.on_the_way ?? 0,
    delivered: statsData?.delivered ?? 0,
    spend: Number(statsData?.total_spend ?? 0),
  };

  const activeList = (deliveries ?? []).filter((d) =>
    OPEN_STATUSES.includes(d.status)
  );
  const historyList = (deliveries ?? []).filter(
    (d) => !OPEN_STATUSES.includes(d.status)
  );
  const shownList = tab === "active" ? activeList : historyList;

  return (
    <div className="min-h-screen bg-stone-100">
      <AppHeader name={user.full_name} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
              {user.role === "rider" ? "Rider workspace" : "Customer workspace"}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Hi {firstName}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Post a new package, follow what is on the way, and look back at
              past deliveries.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium capitalize text-teal-800 ring-1 ring-teal-200">
            {user.role} account
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Requests posted"
            value={String(stats.posted)}
            tone="bg-teal-50 text-teal-700"
            icon={
              <Svg>
                <path d="M7 3h8l4 4v14H7V3z" />
                <path d="M15 3v4h4" />
                <path d="M10 12h6M10 16h6" />
              </Svg>
            }
          />
          <StatCard
            label="On the way"
            value={String(stats.onTheWay)}
            tone="bg-amber-50 text-amber-700"
            icon={
              <Svg>
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </Svg>
            }
          />
          <StatCard
            label="Delivered"
            value={String(stats.delivered)}
            tone="bg-emerald-50 text-emerald-700"
            icon={
              <Svg>
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12.5l2.5 2.5L16 9.5" />
              </Svg>
            }
          />
          <StatCard
            label="Total spend"
            value={`$${stats.spend.toFixed(2)}`}
            tone="bg-slate-100 text-slate-700"
            icon={
              <Svg>
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
                <path d="M16 14.5h2" />
              </Svg>
            }
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-6">
            {statsData && stats.posted === 0 && (
              <div className="flex flex-col gap-4 rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
                    Get started
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Post your first delivery</h2>
                  <p className="mt-1 max-w-md text-sm text-slate-300">
                    Add pickup and drop-off, describe the package, and see the
                    price before you post. Nearby riders see it instantly.
                  </p>
                </div>
                <Link
                  href="/deliveries/new"
                  className="shrink-0 rounded-lg bg-teal-500 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-400"
                >
                  New request
                </Link>
              </div>
            )}

            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex gap-1 border-b border-stone-200 px-4 pt-3">
                {(["active", "history"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 px-3 pb-3 text-sm font-medium transition ${
                      tab === t
                        ? "border-teal-600 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t === "active" ? "Moving right now" : "History"} (
                    {t === "active" ? activeList.length : historyList.length})
                  </button>
                ))}
              </div>

              {deliveries === null ? (
                <p className="px-6 py-14 text-center text-sm text-slate-500">
                  Loading deliveries...
                </p>
              ) : shownList.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-slate-500">
                    <Svg>
                      <path d="M5 13l2-8h10l2 8v6H5z" />
                      <path d="M3 13h5l1.5 3h5L16 13h5" />
                    </Svg>
                  </span>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {tab === "active" ? "Nothing in motion yet" : "No past deliveries"}
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    {tab === "active"
                      ? "Deliveries on their way will show up here with live progress."
                      : "Completed deliveries will be listed here."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {shownList.map((d) => (
                    <DeliveryRow key={d.id} delivery={d} onCancel={cancelDelivery} />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Your account</h2>

              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-base font-semibold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {user.phone ?? "No phone added"}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-stone-200 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="truncate font-medium text-slate-900">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Role</dt>
                  <dd className="font-medium capitalize text-slate-900">{user.role}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Member since</dt>
                  <dd className="font-medium text-slate-900">{memberSince}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Sending something fragile?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Say so in &quot;What&apos;s inside?&quot; so the rider knows
                exactly what they are carrying.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}