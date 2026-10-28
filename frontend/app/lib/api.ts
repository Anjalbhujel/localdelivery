import type { Delivery, Status } from "../components/DeliveryRow";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CancelResult =
  | { ok: true; status: Status }
  | { ok: false; message: string; unauthorized?: boolean };

export async function cancelDeliveryRequest(id: number): Promise<CancelResult> {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/deliveries/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, message: "Please sign in again", unauthorized: true };
    }
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        message:
          typeof data.detail === "string"
            ? data.detail
            : "Could not cancel the request",
      };
    }
    return { ok: true, status: data.status };
  } catch {
    return { ok: false, message: "Could not reach the server" };
  }
}

export async function fetchDeliveries(): Promise<Delivery[] | null> {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export type AdvanceResult =
  | { ok: true }
  | { ok: false; message: string; unauthorized?: boolean };

export async function advanceDeliveryRequest(
  id: number,
  action: "pickup" | "deliver"
): Promise<AdvanceResult> {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/rider/deliveries/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, message: "Please sign in again", unauthorized: true };
    }
    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      message:
        typeof data.detail === "string"
          ? data.detail
          : "Could not update this delivery",
    };
  } catch {
    return { ok: false, message: "Could not reach the server" };
  }
}