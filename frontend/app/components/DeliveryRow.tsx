"use client";

import { useState } from "react";

export type Status =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type Delivery = {
  id: number;
  pickup_location: string;
  pickup_contact_name: string | null;
  drop_location: string;
  drop_contact_name: string | null;
  package_details: string;
  package_size: string;
  package_weight_kg: string | null;
  status: Status;
  created_at: string;
  price: string;
};

export const OPEN_STATUSES: Status[] = ["pending", "accepted", "picked_up"];

const STATUS_STYLE: Record<Status, { label: string; badge: string }> = {
  pending: {
    label: "Waiting for a rider",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  accepted: {
    label: "Rider assigned",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
  },
  picked_up: {
    label: "On the way",
    badge: "bg-teal-50 text-teal-800 ring-teal-200",
  },
  delivered: {
    label: "Delivered",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-stone-100 text-slate-600 ring-stone-300",
  },
};

const STEPS = ["Posted", "Accepted", "Picked up", "Delivered"];

const STEP_INDEX: Record<Status, number> = {
  pending: 0,
  accepted: 1,
  picked_up: 2,
  delivered: 3,
  cancelled: -1,
};

type Props = {
  delivery: Delivery;
  onCancel?: (id: number) => Promise<string | null>;
};

export default function DeliveryRow({ delivery: d, onCancel }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const style = STATUS_STYLE[d.status];
  const isOpen = OPEN_STATUSES.includes(d.status);
  const canCancel = d.status === "pending" && Boolean(onCancel);
  const posted = new Date(d.created_at).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const people = [
    d.pickup_contact_name && `From ${d.pickup_contact_name}`,
    d.drop_contact_name && `To ${d.drop_contact_name}`,
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleCancel() {
    if (!onCancel) return;
    setBusy(true);
    setError("");
    const message = await onCancel(d.id);
    setBusy(false);
    if (message) {
      setError(message);
      setConfirming(false);
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {d.pickup_location} → {d.drop_location}
          </p>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {d.package_details} ·{" "}
            <span className="capitalize">{d.package_size}</span>
            {d.package_weight_kg ? ` · ${Number(d.package_weight_kg)} kg` : ""}
          </p>
          {people && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{people}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-slate-900">
            ${Number(d.price).toFixed(2)}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.badge}`}
          >
            {style.label}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">Posted {posted}</p>
      {isOpen && <Progress status={d.status} />}

      {canCancel && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 pt-3">
          {confirming ? (
            <>
              <span className="text-sm text-slate-700">Cancel this request?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Cancelling..." : "Yes, cancel"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600/20"
            >
              Cancel request
            </button>
          )}
        </div>
      )}
      
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}

function Progress({ status }: { status: Status }) {
  const current = STEP_INDEX[status];
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1">
      {STEPS.map((label, i) => (
        <li key={label}>
          <div
            className={`h-1.5 rounded-full ${
              i <= current ? "bg-teal-600" : "bg-stone-200"
            }`}
          />
          <p
            className={`mt-1 text-xs ${
              i <= current ? "font-medium text-slate-900" : "text-slate-400"
            }`}
          >
            {label}
          </p>
        </li>
      ))}
    </ol>
  );
}