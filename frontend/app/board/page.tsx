"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import { StatCard, Svg } from "../components/StatCard";
import OrderCard, {
  ActiveDelivery,
  BoardCardData,
  capitalize,
  money,
  refCode,
} from "./OrderCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const REFRESH_MS = 30000;

type User = { full_name: string; phone: string | null; role: string };
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

type Sort = "payout" | "newest";
type SizeFilter = "all" | "small" | "medium" | "large";
type Notice = { kind: "success" | "error"; text: string };

const SIZE_FILTERS: { value: SizeFilter; label: string }[] = [
  { value: "all", label: "All sizes" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export default function OrderBoardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [board, setBoard] = useState<BoardCardData[] | null>(null);
  const [active, setActive] = useState<ActiveDelivery[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sort, setSort] = useState<Sort>("payout");
  const [size, setSize] = useState<SizeFilter>("all");

  const approved = profile?.approval_status === "approved";

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [boardRes, activeRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/rider/board`, { headers }),
        fetch(`${API_URL}/rider/deliveries?scope=active`, { headers }),
        fetch(`${API_URL}/rider/stats`, { headers }),
      ]);

      if ([boardRes, activeRes, statsRes].some((r) => r.status === 401)) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (boardRes.ok) setBoard(await boardRes.json());
      if (activeRes.ok) setActive(await activeRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      setNow(Date.now());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    async function init() {
      const meRes = await fetch(`${API_URL}/auth/me`, { headers });
      if (!meRes.ok) throw new Error("unauthorized");
      const me: User = await meRes.json();
      if (me.role !== "rider") {
        router.replace("/dashboard");
        return;
      }
      setUser(me);

      const profileRes = await fetch(`${API_URL}/rider/me`, { headers });
      if (profileRes.ok) setProfile(await profileRes.json());
      else setLoadError(true);
    }

    init().catch((err) => {
      if (err instanceof Error && err.message === "unauthorized") {
        localStorage.removeItem("token");
        router.replace("/login");
      } else {
        setLoadError(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!approved) return;
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [approved, refresh]);

  function handleSignOut() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  async function accept(id: number) {
    const token = localStorage.getItem("token");
    setAccepting(id);
    setNotice(null);

    try {
      const res = await fetch(`${API_URL}/rider/deliveries/${id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (res.ok) {
        setNotice({
          kind: "success",
          text: `You accepted ${refCode(id)}. It is now under Your active deliveries.`,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({
          kind: "error",
          text:
            typeof data.detail === "string"
              ? data.detail
              : "Could not accept this delivery",
        });
      }
      await refresh();
    } catch {
      setNotice({ kind: "error", text: "Could not reach the server" });
    } finally {
      setAccepting(null);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const cards = board ?? [];
  const totalPayoutCents = cards.reduce(
    (sum, c) => sum + Math.round(Number(c.payout) * 100),
    0
  );

  const visible = cards
    .filter((c) => size === "all" || c.package_size === size)
    .sort((a, b) => {
      const newest =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort === "payout" ? Number(b.payout) - Number(a.payout) || newest : newest;
    });

  const details = [
    ...(profile
      ? [
          { label: "Vehicle", value: capitalize(profile.vehicle_type) },
          { label: "Main area", value: profile.address },
        ]
      : []),
    { label: "Phone", value: user.phone ?? "Not added" },
  ];

  const activeCount = active.length;

  return (
    <div className="min-h-screen bg-stone-100">
      <AppHeader
        name={user.full_name}
        role="rider"
        details={details}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
              Rider workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Available deliveries near you
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Every card shows the trip distance, package size and the exact
              amount you take home after completing it.
            </p>
          </div>
          <Link
            href="/deliveries"
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            My deliveries ({activeCount})
          </Link>
        </div>

        {loadError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load the board. It will retry automatically, or refresh
            the page.
          </p>
        )}

        {profile?.approval_status === "pending" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Your account is waiting for approval
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Once the team approves it, deliveries waiting on the board will
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

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Orders on the board"
            value={String(cards.length)}
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
            label="Board payout total"
            value={money(totalPayoutCents / 100)}
            tone="bg-amber-50 text-amber-700"
            icon={
              <Svg>
                <circle cx="12" cy="12" r="9" />
                <path d="M14.5 9.5c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.4 5 1.2 5 3.6 0 1.1-1.1 1.8-2.5 1.8-1.2 0-2.2-.5-2.6-1.4M12 6.5v1.8M12 15.7v1.8" />
              </Svg>
            }
          />
          <StatCard
            label="In progress"
            value={String(stats?.active ?? 0)}
            tone="bg-emerald-50 text-emerald-700"
            icon={
              <Svg>
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </Svg>
            }
          />
          <StatCard
            label="Earned today"
            value={money(stats?.earned_today ?? "0")}
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
          <section>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <div
                role="group"
                aria-label="Sort deliveries"
                className="flex rounded-full bg-stone-100 p-1"
              >
                <SortButton active={sort === "payout"} onClick={() => setSort("payout")}>
                  Best payout
                </SortButton>
                <SortButton disabled title="Available once distance is added">
                  Closest
                </SortButton>
                <SortButton active={sort === "newest"} onClick={() => setSort("newest")}>
                  Newest
                </SortButton>
              </div>

              <div role="group" aria-label="Package size" className="flex flex-wrap gap-2">
                {SIZE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={size === f.value}
                    onClick={() => setSize(f.value)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      size === f.value
                        ? "bg-teal-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-stone-300 hover:text-slate-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label
                className="ml-auto flex items-center gap-2 text-sm text-slate-400"
                title="Available once distance is added"
              >
                Within 12 km
                <input
                  type="range"
                  min={1}
                  max={20}
                  defaultValue={12}
                  disabled
                  className="w-28 cursor-not-allowed"
                />
              </label>
            </div>

            {notice && (
              <p
                role="status"
                className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                  notice.kind === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </p>
            )}

            {!approved ? null : board === null ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                Loading deliveries...
              </p>
            ) : cards.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  No deliveries waiting right now
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  New requests appear here as customers post them. The board
                  refreshes by itself every 30 seconds.
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                >
                  Refresh now
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  No deliveries match this size
                </p>
                <button
                  type="button"
                  onClick={() => setSize("all")}
                  className="mt-2 text-sm font-medium text-teal-700 hover:underline"
                >
                  Show all sizes
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {visible.map((card) => (
                  <OrderCard
                    key={card.id}
                    card={card}
                    now={now}
                    busy={accepting === card.id}
                    locked={accepting !== null}
                    onAccept={accept}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500 text-base font-semibold text-white">
                  {user.full_name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.full_name}</p>
                  <p className="truncate text-xs text-slate-300">
                    {profile
                      ? `${capitalize(profile.vehicle_type)} · ${profile.address}`
                      : "Rider"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 px-3 py-3 text-center">
                  <p className="text-xl font-bold text-teal-300">
                    {stats?.completed ?? 0}
                  </p>
                  <p className="text-xs text-slate-300">completed</p>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-3 text-center">
                  <p className="text-xl font-bold text-teal-300">
                    {money(stats?.earned_today ?? "0")}
                  </p>
                  <p className="text-xs text-slate-300">today</p>
                </div>
              </div>

              <button
                type="button"
                disabled
                title="The earnings page is coming soon"
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 opacity-60"
              >
                View earnings →
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Your active deliveries
                </h2>
                <span className="text-sm text-slate-500">{activeCount}</span>
              </div>

              {activeCount === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Nothing accepted yet. Deliveries you accept will show up here.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {active.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">{refCode(d.id)}</span>
                        {d.payout && (
                          <span className="text-sm font-semibold text-teal-700">
                            {money(d.payout)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {d.pickup_location}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        → {d.drop_location}
                      </p>
                      <Link
                        href="/deliveries"
                        className="mt-3 block rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open delivery
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SortButton({
  active = false,
  disabled = false,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : disabled
            ? "cursor-not-allowed text-slate-400"
            : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}