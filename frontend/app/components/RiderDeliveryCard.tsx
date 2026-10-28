"use client";

import { useState } from "react";
import { capitalize, money, refCode, timeAgo } from "../board/OrderCard";

export type RiderDelivery = {
  id: number;
  status: "accepted" | "picked_up" | "delivered";
  pickup_location: string;
  pickup_contact_name: string | null;
  drop_location: string;
  drop_contact_name: string | null;
  package_details: string;
  package_size: string;
  package_weight_kg: string | null;
  payout: string | null;
  customer_name: string;
  customer_phone: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
};

export type Advance = "pickup" | "deliver";

const STATUS: Record<RiderDelivery["status"], { label: string; badge: string }> = {
  accepted: { label: "Accepted", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  picked_up: { label: "In transit", badge: "bg-teal-50 text-teal-800 ring-teal-200" },
  delivered: {
    label: "Delivered",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
};

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  delivery: RiderDelivery;
  onAdvance?: (id: number, action: Advance) => Promise<string | null>;
};

export default function RiderDeliveryCard({ delivery: d, onAdvance }: Props) {
  const [now] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const style = STATUS[d.status];
  const next: Advance | null = !onAdvance
    ? null
    : d.status === "accepted"
      ? "pickup"
      : d.status === "picked_up"
        ? "deliver"
        : null;

  const since =
    d.status === "delivered"
      ? `Delivered ${timeAgo(d.delivered_at ?? d.created_at, now)}`
      : `Accepted ${timeAgo(d.accepted_at ?? d.created_at, now)}`;

  const timeline = [
    { label: "Accepted", at: d.accepted_at },
    { label: "Picked up", at: d.picked_up_at },
    { label: "Delivered", at: d.delivered_at },
  ];

  async function run(action: Advance) {
    if (!onAdvance) return;
    setBusy(true);
    setError("");
    const message = await onAdvance(d.id, action);
    setBusy(false);
    if (message) {
      setError(message);
      setConfirming(false);
    }
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {refCode(d.id)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.badge}`}
          >
            {style.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">
            {d.payout ? money(d.payout) : "—"}
          </p>
          <p className="text-xs text-slate-500">payout</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Place label="Pickup" address={d.pickup_location} contact={d.pickup_contact_name} />
        <Place label="Drop-off" address={d.drop_location} contact={d.drop_contact_name} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span title="Available once distance is added">Distance —</span>
        <span>{capitalize(d.package_size)}</span>
        <span title="Available once distance is added">Due —</span>
        <span>{since}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="min-w-[9rem] flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {open ? "Hide details" : "Open delivery →"}
        </button>

        {next && !confirming && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (next === "deliver" ? setConfirming(true) : run("pickup"))}
            className="min-w-[9rem] flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Updating..."
              : next === "pickup"
                ? "Mark picked up"
                : "Mark delivered"}
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-slate-700">
            Mark as delivered? This records the cash payment as received.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:opacity-60"
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run("deliver")}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving..." : "Yes, delivered"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-4 rounded-xl bg-stone-50 p-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              What&apos;s inside
            </p>
            <p className="mt-1 break-words text-slate-900">
              {d.package_details}
              {d.package_weight_kg ? ` · ${Number(d.package_weight_kg)} kg` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Customer
            </p>
            <p className="mt-1 text-slate-900">
              {d.customer_name}
              {" · "}
              {d.customer_phone ? (
                <a
                  href={`tel:${d.customer_phone}`}
                  className="font-medium text-teal-700 hover:underline"
                >
                  {d.customer_phone}
                </a>
              ) : (
                <span className="text-slate-400">no phone</span>
              )}
            </p>
          </div>

          <ol className="space-y-2">
            {timeline.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    s.at ? "bg-teal-600" : "bg-stone-300"
                  }`}
                />
                <span className={s.at ? "font-medium text-slate-900" : "text-slate-400"}>
                  {s.label}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {s.at ? formatTime(s.at) : "—"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

function Place({
  label,
  address,
  contact,
}: {
  label: string;
  address: string;
  contact: string | null;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{address}</p>
      {contact && <p className="text-sm text-slate-500">{contact}</p>}
    </div>
  );
}