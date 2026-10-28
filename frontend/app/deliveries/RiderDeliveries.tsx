"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import RiderDeliveryCard, {
  Advance,
  RiderDelivery,
} from "../components/RiderDeliveryCard";
import { capitalize, money } from "../board/OrderCard";
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
};

type Stats = {
  total_earned: string;
  earned_today: string;
  completed: number;
  active: number;
};

const STAGES = ["Accepted", "Picked up (in transit)", "Delivered"];

export default function RiderDeliveries({ user, onSignOut }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [active, setActive] = useState<RiderDelivery[] | null>(null);
  const [history, setHistory] = useState<RiderDelivery[] | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
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

      if (meRes.ok) {
        const me: Profile = await meRes.json();
        setProfile(me);
        if (me.approval_status === "approved") {
          const boardRes = await fetch(`${API_URL}/rider/board`, { headers });
          if (boardRes.ok) setBoardCount((await boardRes.json()).length);
        }
      } else {
        setLoadError(true);
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

  const details = [
    ...(profile
      ? [
          { label: "Vehicle", value: capitalize(profile.vehicle_type) },
          { label: "Main area", value: profile.address },
        ]
      : []),
    { label: "Phone", value: user.phone ?? "Not added" },
  ];

  const completed = stats?.completed ?? 0;

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
            <h1 className="mt-1 text-3xl font-bold text-slate-900">My deliveries</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Move each delivery to the next stage. Customers see the new
              status on their dashboard.
            </p>
          </div>
          <Link
            href="/board"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-50"
          >
            Board{boardCount !== null ? ` (${boardCount})` : ""}
          </Link>
        </div>

        {loadError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load your deliveries. Please refresh the page.
          </p>
        )}

        {profile && profile.approval_status !== "approved" && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
            {profile.approval_status === "pending"
              ? "Your rider account is waiting for approval. Deliveries you accept will appear here."
              : "Your rider application was not approved."}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Active ({active?.length ?? 0})
              </h2>
              <div className="mt-3 space-y-4">
                {active === null ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : active.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      No active deliveries
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Deliveries you accept will show up here.
                    </p>
                    <Link
                      href="/board"
                      className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline"
                    >
                      Browse the order board
                    </Link>
                  </div>
                ) : (
                  active.map((d) => (
                    <RiderDeliveryCard key={d.id} delivery={d} onAdvance={advance} />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Completed ({history?.length ?? 0})
              </h2>
              <div className="mt-3 space-y-4">
                {history === null ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
                    <p className="text-sm text-slate-500">No completed deliveries yet.</p>
                  </div>
                ) : (
                  history.map((d) => <RiderDeliveryCard key={d.id} delivery={d} />)
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
                How payouts work
              </p>
              <p className="mt-2 text-3xl font-bold text-teal-300">
                {money(stats?.total_earned ?? "0")}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Total earned across {completed}{" "}
                {completed === 1 ? "delivery" : "deliveries"}
              </p>
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-200">
                {[
                  "Your payout is shown on every card before you accept",
                  "It counts as earned when you mark a delivery delivered",
                  "Customers pay in cash on handover",
                ].map((text) => (
                  <li key={text} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Status stages</h2>
              <ol className="mt-3 space-y-3">
                {STAGES.map((stage, i) => (
                  <li key={stage} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-slate-600">
                      {i + 1}
                    </span>
                    {stage}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}