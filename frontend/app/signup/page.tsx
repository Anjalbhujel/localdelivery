"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthLayout from "../components/AuthLayout";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const AREAS = ["Dharanline", "Biratnagarilne", "Purba", "Paschim"];

const VEHICLES = [
  { value: "bike", label: "Bike" },
  { value: "scooter", label: "Scooter" },
  { value: "car", label: "Car" },
];

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

type Role = "customer" | "rider";

function choiceClass(selected: boolean) {
  return `rounded-lg border px-3 py-2.5 text-left transition ${
    selected
      ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
      : "border-stone-300 bg-white hover:border-stone-400"
  }`;
}

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("scooter");
  const [area, setArea] = useState(AREAS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRider = role === "rider";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, string | null> = {
      full_name: fullName,
      email,
      password,
      role,
      phone: phone.trim() || null,
    };
    if (isRider) {
      body.vehicle_type = vehicle;
      body.area = area;
    }

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.[0]?.msg ?? "Something went wrong"
        );
        return;
      }

      router.push("/login");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      active="signup"
      title="Join SwiftRoute"
      subtitle="Choose how you want to use SwiftRoute. You can only pick one at signup."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className={labelClass}>I am signing up as a</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={!isRider}
              onClick={() => setRole("customer")}
              className={choiceClass(!isRider)}
            >
              <span className="block text-sm font-semibold text-slate-900">Customer</span>
              <span className="block text-xs text-slate-500">Send packages</span>
            </button>
            <button
              type="button"
              aria-pressed={isRider}
              onClick={() => setRole("rider")}
              className={choiceClass(isRider)}
            >
              <span className="block text-sm font-semibold text-slate-900">Rider</span>
              <span className="block text-xs text-slate-500">Deliver and earn</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="full_name" className={labelClass}>
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Dana Whitfield"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            {isRider ? "Phone (riders need this for pickups)" : "Phone (optional)"}
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 (415) 000-0000"
            pattern="[0-9+\(\) \-]{7,20}"
            title="7 to 20 characters: digits, spaces, + ( ) -"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required={isRider}
            className={inputClass}
          />
        </div>

        {isRider && (
          <>
            <div>
              <p className={labelClass}>Vehicle</p>
              <div className="grid grid-cols-3 gap-3">
                {VEHICLES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    aria-pressed={vehicle === v.value}
                    onClick={() => setVehicle(v.value)}
                    className={`${choiceClass(vehicle === v.value)} text-center text-sm font-medium text-slate-900`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="area" className={labelClass}>
                Main area
              </label>
              <select
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={inputClass}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : `Create ${role} account`}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Sign in instead
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}