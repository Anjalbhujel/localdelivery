"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import DeliveryRow, { Delivery, OPEN_STATUSES } from "../components/DeliveryRow";
import { cancelDeliveryRequest, fetchDeliveries } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = { full_name: string; role: string };
type Filter = "all" | "active" | "delivered" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function matchesFilter(d: Delivery, filter: Filter): boolean {
  if (filter === "active") return OPEN_STATUSES.includes(d.status);
  if (filter === "delivered") return d.status === "delivered";
  if (filter === "cancelled") return d.status === "cancelled";
  return true;
}

function matchesQuery(d: Delivery, query: string): boolean {
  if (!query) return true;
  const text = [
    d.pickup_location,
    d.drop_location,
    d.package_details,
    d.pickup_contact_name,
    d.drop_contact_name,
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(query);
}

export default function MyDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

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
      .then((data: Me) => {
        if (data.role !== "customer") {
          router.replace("/dashboard");
          return;
        }
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/login");
      });

    fetch(`${API_URL}/deliveries`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: Delivery[]) => setDeliveries(data))
      .catch(() => setLoadError(true));
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

  const all = deliveries ?? [];
  const counts: Record<Filter, number> = {
    all: all.length,
    active: all.filter((d) => matchesFilter(d, "active")).length,
    delivered: all.filter((d) => matchesFilter(d, "delivered")).length,
    cancelled: all.filter((d) => matchesFilter(d, "cancelled")).length,
  };

  const q = query.trim().toLowerCase();
  const shown = all.filter((d) => matchesFilter(d, filter) && matchesQuery(d, q));

  return (
    <div className="min-h-screen bg-stone-100">
      <AppHeader name={user.full_name} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-900">My deliveries</h1>
        <p className="mt-2 text-sm text-slate-600">
          Every package you have posted, newest first.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  filter === f.value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-stone-300 hover:text-slate-900"
                }`}
              >
                {f.label} ({counts[f.value]})
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="search" className="sr-only">
              Search deliveries
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search address or package"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-white shadow-sm">
          {loadError ? (
            <p className="px-6 py-14 text-center text-sm text-red-700">
              Could not load your deliveries. Please refresh the page.
            </p>
          ) : deliveries === null ? (
            <p className="px-6 py-14 text-center text-sm text-slate-500">
              Loading deliveries...
            </p>
          ) : all.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-900">No deliveries yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Post your first package and it will show up here.
              </p>
              <Link
                href="/deliveries/new"
                className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Post a delivery
              </Link>
            </div>
          ) : shown.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No deliveries match
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
                className="mt-2 text-sm font-medium text-teal-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {shown.map((d) => (
                <DeliveryRow key={d.id} delivery={d} onCancel={cancelDelivery} />
              ))}
            </ul>
          )}
        </div>

        {deliveries && all.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {shown.length} of {all.length}
          </p>
        )}
      </main>
    </div>
  );
}