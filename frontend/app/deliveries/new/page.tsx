"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Size = "small" | "medium" | "large";

type Me = { full_name: string; phone: string | null; role: string };
type PastDelivery = { pickup_location: string; drop_location: string };
type Quote = {
  base_fare: string;
  size_surcharge: string;
  service_fee: string;
  total: string;
  rider_payout: string;
};

const SIZES: { value: Size; label: string; hint: string; max: number }[] = [
  { value: "small", label: "Small", hint: "Up to 5 kg", max: 5 },
  { value: "medium", label: "Medium", hint: "Up to 15 kg", max: 15 },
  { value: "large", label: "Large", hint: "Up to 30 kg", max: 30 },
];

const FIELD_LABELS: Record<string, string> = {
  pickup_location: "Pickup location",
  pickup_contact_name: "Pickup contact",
  drop_location: "Drop location",
  drop_contact_name: "Receiver name",
  package_weight_kg: "Weight",
  package_details: "What's inside",
  customer_phone: "Phone",
};

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

const money = (v: string) => `$${Number(v).toFixed(2)}`;

function readError(data: { detail?: unknown }): string {
  const d = data.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0] as { msg?: string; loc?: (string | number)[] };
    const message = String(first.msg ?? "Invalid input").replace(/^Value error, /, "");
    const field = first.loc ? FIELD_LABELS[String(first.loc[first.loc.length - 1])] : undefined;
    return field ? `${field}: ${message}` : message;
  }
  return "Something went wrong";
}

function recent(list: PastDelivery[], key: keyof PastDelivery) {
  return Array.from(new Set(list.map((d) => d[key]))).slice(0, 3);
}

export default function NewDeliveryPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [past, setPast] = useState<PastDelivery[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);

  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [pickupContact, setPickupContact] = useState("");
  const [drop, setDrop] = useState("");
  const [dropContact, setDropContact] = useState("");
  const [size, setSize] = useState<Size>("small");
  const [weight, setWeight] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        setPhone(data.phone ?? "");
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/login");
      });

    fetch(`${API_URL}/deliveries`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PastDelivery[]) => setPast(data));
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let cancelled = false;

    fetch(`${API_URL}/deliveries/quote?size=${size}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Quote | null) => {
        if (!cancelled) setQuote(data);
      });

    return () => {
      cancelled = true;
    };
  }, [size]);

  function handleSignOut() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          pickup_location: pickup,
          pickup_contact_name: pickupContact,
          drop_location: drop,
          drop_contact_name: dropContact,
          package_size: size,
          package_weight_kg: weight,
          package_details: details,
          customer_phone: phone.trim() || null,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(readError(data));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const maxWeight = SIZES.find((s) => s.value === size)!.max;
  const sizeLabel = SIZES.find((s) => s.value === size)!.label;

  return (
    <div className="min-h-screen bg-stone-100">
      <AppHeader name={user.full_name} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          New request
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Send a package</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tell us where to collect it and where it goes. Riders nearby will see
          it instantly.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <Section number={1} title="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" htmlFor="name">
                  <input
                    id="name"
                    value={user.full_name}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-stone-50 text-slate-500`}
                  />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 (415) 000-0000"
                    pattern="[0-9+\(\) \-]{7,20}"
                    title="7 to 20 characters: digits, spaces, + ( ) -"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={!user.phone}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            <Section number={2} title="Locations">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Field label="Pickup location" htmlFor="pickup">
                    <input
                      id="pickup"
                      placeholder="Street, unit, entrance..."
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      required
                      minLength={3}
                      maxLength={500}
                      className={inputClass}
                    />
                  </Field>
                  <Chips items={recent(past, "pickup_location")} onPick={setPickup} />
                  <input
                    aria-label="Who hands the package over?"
                    placeholder="Who hands the package over?"
                    value={pickupContact}
                    onChange={(e) => setPickupContact(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-3">
                  <Field label="Drop location" htmlFor="drop">
                    <input
                      id="drop"
                      placeholder="Street, unit, entrance..."
                      value={drop}
                      onChange={(e) => setDrop(e.target.value)}
                      required
                      minLength={3}
                      maxLength={500}
                      className={inputClass}
                    />
                  </Field>
                  <Chips items={recent(past, "drop_location")} onPick={setDrop} />
                  <input
                    aria-label="Who receives it?"
                    placeholder="Who receives it?"
                    value={dropContact}
                    onChange={(e) => setDropContact(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section number={3} title="Package details">
              <div className="grid grid-cols-3 gap-3">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={size === s.value}
                    onClick={() => setSize(s.value)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      size === s.value
                        ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                        : "border-stone-300 bg-white hover:border-stone-400"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-900">
                      {s.label}
                    </span>
                    <span className="block text-xs text-slate-500">{s.hint}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr]">
                <Field label="Weight (kg)" htmlFor="weight">
                  <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    max={maxWeight}
                    placeholder="2.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="What's inside?" htmlFor="details">
                  <input
                    id="details"
                    placeholder="e.g. Sealed envelope with documents. Fragile? Say so here."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    required
                    minLength={3}
                    maxLength={1000}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            {error && (
              <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-5">
              <p className="text-xs text-slate-500">
                Nothing is charged until a rider accepts the request.
              </p>
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600 lg:hidden">
                  Total{" "}
                  <span className="font-semibold text-slate-900">
                    {quote ? money(quote.total) : "—"}
                  </span>
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Posting..." : "Post delivery request"}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-teal-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
                Live estimate
              </p>
              <p className="mt-2 text-4xl font-bold">
                {quote ? money(quote.total) : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Rider earns {quote ? money(quote.rider_payout) : "—"}
              </p>

              <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                <Row label="Base fare" value={quote ? money(quote.base_fare) : "—"} />
                <Row
                  label={`${sizeLabel} surcharge`}
                  value={quote ? money(quote.size_surcharge) : "—"}
                />
                <Row
                  label="Service fee"
                  value={quote ? money(quote.service_fee) : "—"}
                />
              </dl>

              <p className="mt-5 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                Your price is confirmed when you post.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">What riders see</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  "Pickup and drop area, exact addresses after accepting",
                  "Their payout for the trip",
                  "Package size, weight and what's inside",
                ].map((text) => (
                  <li key={text} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                    {text}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-stone-200 pt-3 text-sm text-slate-600">
                Covered up to $300 per package
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-stone-200 py-6 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {number} · {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Chips({
  items,
  onPick,
}: {
  items: string[];
  onPick: (value: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="max-w-[14rem] truncate rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-xs text-slate-600 transition hover:border-teal-600 hover:text-slate-900"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-300">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}