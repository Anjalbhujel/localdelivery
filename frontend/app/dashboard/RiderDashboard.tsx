"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import RiderDeliveryCard, {
  Advance,
  RiderDelivery,
  formatTime,
} from "../components/RiderDeliveryCard";
import { StatCard, Svg } from "../components/StatCard";
import { advanceDeliveryRequest } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Props = {
  user: { full_name: string; phone: string | null };
  onSignOut: () => void;
};

type Profile = {
  vehicle_type: string;
  address: string;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
};

type Stats = {
  total_earned: string;
  earned_today: string;
  completed: number;
  active: number;
};

type BoardCard = {
  id: number;
  pickup_location: string;
  drop_location: string;
  package_size: string;
  package_weight_kg: string | null;
  payout: string;
  created_at: string;
};

const money = (v: string | number) => `$${Number(v).toFixed(2)}`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const refCode = (id: number) => `SR-${String(id).padStart(4, "0")}`;

export default function RiderDashboard({ user, onSignOut }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [board, setBoard] = useState<BoardCard[] | null>(null);
  const [active, setActive] = useState<RiderDelivery[] | null>(null);
  const [history, setHistory] = useState<RiderDelivery[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const responses = await Promise.all([
        fetch(`${API_URL}/rider/me`, { headers }),
        fetch(`${API_URL}/rider/stats`, { headers }),
        fetch(`${API_URL}/rider/deliveries?scope=active`, { headers }),
        fetch(`${API_URL}/rider/deliveries?scope=history`, { headers }),
      ]);
      const [meRes, statsRes, activeRes, historyRes] = responses;

      if (responses.some((r) => r.status === 401)) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      setActive(activeRes.ok ? await activeRes.json() : []);
      setHistory(historyRes.ok ? await historyRes.json() : []);

      if (!meRes.ok) {
        setLoadError(true);
        return;
      }

      const me: Profile = await meRes.json();
      setProfile(me);

      if (me.approval_status === "approved") {
        const boardRes = await fetch(`${API_URL}/rider/board`, { headers });
        setBoard(boardRes.ok ? await boardRes.json() : []);
      }
    } catch {
      setLoadError(true);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(id: number, action: Advance): Promise<string | null> {
    setNotice("");
    const result = await advanceDeliveryRequest(id, action);

    if (result.ok) {
      if (action === "deliver") {
        setNotice("Marked as delivered. The cash payment is recorded as received.");
      }
      await load();
      return null;
    }

    if (result.unauthorized) {
      localStorage.removeItem("token");
      router.replace("/login");
      return null;
    }

    await load();
    return result.message;
  }

  const firstName = user.full_name.trim().split(" ")[0];
  const approved = profile?.approval_status === "approved";

  const details = [
    ...(profile
      ? [
          { label: "Vehicle", value: capitalize(profile.vehicle_type) },
          { label: "Main area", value: profile.address },
        ]
      : []),
    { label: "Phone", value: user.phone ?? "Not added" },
  ];

  const waiting = board?.length ?? 0;

  return (
    <div className="min-h-screen bg-stone-100">
      <AppHeader
        name={user.full_name}
        role="rider"
        details={details}
        onSignOut={onSignOut}
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
              Rider workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Hi {firstName}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Your accepted deliveries, your earnings, and the best trips
              waiting on the board right now.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
            Rider account
          </span>
        </div>

        {loadError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load your rider details. Please refresh the page.
          </p>
        )}

        {profile?.approval_status === "pending" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Your account is waiting for approval
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Once the team approves it, the order board and its trips will
              appear here.
            </p>
          </div>
        )}

        {profile?.approval_status === "rejected" && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Your rider application was not approved
            </h2>
            {profile.rejection_reason && (
              <p className="mt-1 text-sm text-slate-600">
                Reason: {profile.rejection_reason}
              </p>
            )}
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total earned"
            value={money(stats?.total_earned ?? "0")}
            tone="bg-teal-50 text-teal-700"
            icon={
              <Svg>
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" />
                <path d="M16 14.5h2" />
              </Svg>
            }
          />
          <StatCard
            label="Completed trips"
            value={String(stats?.completed ?? 0)}
            tone="bg-emerald-50 text-emerald-700"
            icon={
              <Svg>
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12.5l2.5 2.5L16 9.5" />
              </Svg>
            }
          />
          <StatCard
            label="Active now"
            value={String(stats?.active ?? 0)}
            tone="bg-amber-50 text-amber-700"
            icon={
              <Svg>
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </Svg>
            }
          />
        </div>

        {approved && (
          <div className="mt-6 rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
              Open board
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {board === null
                ? "Checking the board..."
                : waiting === 0
                  ? "No deliveries waiting right now"
                  : `${waiting} ${waiting === 1 ? "delivery" : "deliveries"} waiting`}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-slate-300">
              Every card shows the package size and the exact amount you take
              home.
            </p>
          </div>
        )}

        <Section
          title="Active deliveries"
          count={active?.length ?? 0}
          loading={active === null}
          emptyTitle="No active deliveries"
          emptyText="Deliveries you accept will show up here."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {(active ?? []).map((d) => (
              <RiderDeliveryCard key={d.id} delivery={d} onAdvance={advance} />
            ))}
          </div>
        </Section>

        {approved && board && waiting > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">
              Best paying right now
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {board.slice(0, 3).map((card) => (
                <article
                  key={card.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {refCode(card.id)}
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      {money(card.payout)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">From</p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {card.pickup_location}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">To</p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {card.drop_location}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    <span className="capitalize">{card.package_size}</span>
                    {card.package_weight_kg
                      ? ` · ${Number(card.package_weight_kg)} kg`
                      : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <Section
          title="History"
          count={history?.length ?? 0}
          loading={history === null}
          emptyTitle="No completed deliveries yet"
          emptyText="Your finished trips will be listed here."
        >
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {(history ?? []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {d.pickup_location} → {d.drop_location}
                  </p>
                  <p className="text-xs text-slate-500">
                    {refCode(d.id)} · Delivered {formatTime(d.delivered_at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-900">
                  {d.payout ? money(d.payout) : "—"}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  loading,
  emptyTitle,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  loading: boolean;
  emptyTitle: string;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">
        {title} ({count})
      </h2>
      <div className="mt-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}