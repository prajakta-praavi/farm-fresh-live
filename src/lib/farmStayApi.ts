export interface PublicFarmStaySettings {
  total_property_capacity: number;
  total_rooms: number;
  room_base_capacity: number;
  room_max_capacity: number;
  room_price_per_night: number;
  extra_bed_charge: number;
}

export interface PublicFarmStayUnit {
  id: number;
  unit_type: "ROOM" | "TENT";
  unit_name: string;
  capacity: number;
  price_per_night: number;
  is_active: number;
}

export interface FarmStayAvailabilityResponse {
  available: boolean;
  message: string;
  remaining_spots: number;
  settings: PublicFarmStaySettings;
  allocation?: {
    rooms_needed?: number;
    extra_beds?: number;
    unit_ids?: number[];
    tents?: Array<{
      unit_id: number;
      unit_name: string;
      guests_allocated: number;
      unit_price_per_night: number;
    }>;
  };
  pricing?: {
    nights: number;
    subtotal_per_night: number;
    gst_rate: number;
    gst_amount_per_night: number;
    total_gst: number;
    total_price: number;
  };
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_BASE_CANDIDATES =
  typeof window !== "undefined"
    ? Array.from(
        new Set(
          [
            API_BASE_URL,
            `${window.location.origin}/backend`,
            `${window.location.origin}/farm-fresh/farm-fresh-live/backend`,
            `${window.location.origin}/farm-fresh-live/backend`,
            "http://localhost/backend",
            "http://localhost/farm-fresh/farm-fresh-live/backend",
            "http://localhost/farm-fresh-live/backend",
          ].filter(Boolean)
        )
      )
    : [API_BASE_URL];

const isRouteNotFound = (response: Response, payload: unknown): boolean => {
  if (response.status === 404) return true;
  if (!payload || typeof payload !== "object") return false;
  const message = String((payload as { message?: string }).message || "").toLowerCase();
  return message.includes("route not found");
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  let lastError: Error | null = null;
  for (const baseUrl of API_BASE_CANDIDATES) {
    const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        return json as T;
      }
      if (!isLastCandidate && isRouteNotFound(response, json)) {
        continue;
      }
      throw new Error(String((json as { message?: string }).message || "Request failed"));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed");
      if (!isLastCandidate && error instanceof TypeError) {
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error("Request failed");
}

export const farmStayApi = {
  getConfig: () => request<{ settings: PublicFarmStaySettings; units: PublicFarmStayUnit[] }>("/api/farm-stay/config"),
  checkAvailability: (payload: {
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    accommodation_type: "ROOM" | "TENT";
  }) =>
    request<FarmStayAvailabilityResponse>("/api/farm-stay/availability", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createBooking: (payload: {
    full_name: string;
    phone: string;
    email?: string;
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    accommodation_type: "ROOM" | "TENT";
    notes?: string;
  }) =>
    request<{
      id: number;
      message: string;
      pricing?: FarmStayAvailabilityResponse["pricing"];
      allocation?: FarmStayAvailabilityResponse["allocation"];
    }>("/api/farm-stay/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
