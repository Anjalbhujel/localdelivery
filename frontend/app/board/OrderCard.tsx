export type BoardCardData = {
  id: number;
  pickup_location: string;
  drop_location: string;
  package_details: string;
  package_size: string;
  package_weight_kg: string | null;
  payout: string;
  urgent: boolean;
  created_at: string;
};

export type ActiveDelivery = {
  id: number;
  status: string;
  pickup_location: string;
  drop_location: string;
  payout: string | null;
};

export const money = (v: string | number) => `$${Number(v).toFixed(2)}`;
export const refCode = (id: number) => `SR-${String(id).padStart(4, "0")}`;
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

type Props = {
  card: BoardCardData;
  now: number;
  busy: boolean;
  locked: boolean;
  onAccept: (id: number) => void;
};

export default function OrderCard({ card, now, busy, locked, onAccept }: Props) {
  return (
    <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {refCode(card.id)}
            </span>
            {card.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                  <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
                </svg>
                Urgent
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Posted {timeAgo(card.created_at, now)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{money(card.payout)}</p>
          <p className="text-xs font-medium text-teal-700">you earn</p>
        </div>
      </div>

      <div className="relative mt-4 space-y-3 pl-6">
        <span className="absolute bottom-2 left-[4px] top-2 w-px bg-stone-300" aria-hidden="true" />
        <p className="relative text-sm font-medium text-slate-900">
          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
          {card.pickup_location}
        </p>
        <p className="relative text-sm font-medium text-slate-900">
          <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-teal-600" />
          {card.drop_location}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div
          className="rounded-xl bg-stone-50 px-3 py-2 text-center"
          title="Available once distance is added"
        >
          <p className="text-xs text-slate-500">Distance</p>
          <p className="text-sm font-semibold text-slate-400">—</p>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2 text-center">
          <p className="text-xs text-slate-500">Package</p>
          <p className="text-sm font-semibold text-slate-900">{capitalize(card.package_size)}</p>
        </div>
        <div
          className="rounded-xl bg-stone-50 px-3 py-2 text-center"
          title="Available once distance is added"
        >
          <p className="text-xs text-slate-500">Due by</p>
          <p className="text-sm font-semibold text-slate-400">—</p>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
        <span className="min-w-0 break-words">
          {card.package_details}
          {card.package_weight_kg ? ` · ${Number(card.package_weight_kg)} kg` : ""}
        </span>
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-200 pt-4 mt-4">
        <p className="text-sm text-slate-400">— min trip</p>
        <button
          type="button"
          onClick={() => onAccept(card.id)}
          disabled={locked}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Accepting..." : "Accept delivery →"}
        </button>
      </div>
    </article>
  );
}