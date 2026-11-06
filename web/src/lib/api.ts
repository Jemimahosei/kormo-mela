const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_URL || "http://localhost:8000/api";

export interface BraidStyle {
  id: number;
  name: string;
  description: string;
  typical_duration_minutes: number | null;
}

export interface Listing {
  id: number;
  braider: number;
  braider_id: number;
  braider_name: string;
  braider_is_demo: boolean;
  campus_area: string;
  style: number;
  style_name: string;
  title: string;
  description: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface Review {
  id: number;
  booking: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Braider {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  campus_area: string;
  location_detail: string;
  instagram: string;
  years_experience: number;
  available_days: string[];
  available_start_time: string | null;
  available_end_time: string | null;
  is_active: boolean;
  is_demo: boolean;
  average_rating: number | null;
  review_count: number;
  listings: Listing[];
  reviews: Review[];
  match_score?: number;
  match_breakdown?: Record<string, number>;
  cheapest_listing?: Listing;
}

export interface Booking {
  id: number;
  client: number;
  client_name: string;
  listing: number;
  listing_title: string;
  style_name: string;
  braider: number;
  braider_id: number;
  braider_name: string;
  price: string;
  duration_minutes: number;
  date: string;
  start_time: string;
  end_time: string;
  status: "requested" | "accepted" | "declined" | "completed" | "cancelled";
  notes: string;
}

export interface AuthUser {
  username: string;
  role: "braider" | "client" | null;
  profile_id: number | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const page = data as Paginated<T>;
  return page.results ?? [];
}

export function getToken(): string | null {
  return localStorage.getItem("kormo_token");
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("kormo_user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function storeAuth(token: string, user: AuthUser) {
  localStorage.setItem("kormo_token", token);
  localStorage.setItem("kormo_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("kormo_token");
  localStorage.removeItem("kormo_user");
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail =
        body?.detail ||
        (typeof body === "object"
          ? Object.entries(body)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
              .join("; ")
          : detail);
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  styles: () => request<BraidStyle[]>("/styles/"),
  braiders: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<Paginated<Braider>>(`/braiders/${q ? `?${q}` : ""}`).then(unwrap<Braider>);
  },
  braider: (id: number | string) => request<Braider>(`/braiders/${id}/`),
  recommended: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<Braider[]>(`/recommended/?${q}`);
  },
  listings: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<Paginated<Listing>>(`/listings/${q ? `?${q}` : ""}`).then(unwrap<Listing>);
  },
  myListings: () => request<Listing[]>("/my-listings/"),
  createListing: (data: Record<string, unknown>) =>
    request<Listing>("/listings/", { method: "POST", body: JSON.stringify(data) }),
  updateListing: (id: number, data: Record<string, unknown>) =>
    request<Listing>(`/listings/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  myBraiderProfile: () => request<Braider>("/braiders/me/"),
  updateBraiderProfile: (data: Record<string, unknown>) =>
    request<Braider>("/braiders/me/", { method: "PATCH", body: JSON.stringify(data) }),
  myClientProfile: () => request<{ id: number; display_name: string }>("/clients/me/"),
  bookings: (status?: string) =>
    request<Booking[]>(`/bookings/${status ? `?status=${status}` : ""}`),
  createBooking: (data: Record<string, unknown>) =>
    request<Booking>("/bookings/", { method: "POST", body: JSON.stringify(data) }),
  bookingAction: (id: number, action: "accept" | "decline" | "complete" | "cancel") =>
    request<Booking>(`/bookings/${id}/${action}/`, { method: "POST" }),
  reviewBooking: (id: number, rating: number, comment: string) =>
    request<Review>(`/bookings/${id}/review/`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  braiderReviews: (id: number) => request<Review[]>(`/braiders/${id}/reviews/`),
  login: (username: string, password: string) =>
    request<{ token: string; username: string; role: AuthUser["role"]; profile_id: number }>(
      "/auth/login/",
      { method: "POST", body: JSON.stringify({ username, password }) },
    ),
  register: (username: string, password: string, role: "braider" | "client", display_name: string) =>
    request<{ token: string; username: string; role: AuthUser["role"]; profile_id: number }>(
      "/auth/register/",
      { method: "POST", body: JSON.stringify({ username, password, role, display_name }) },
    ),
};

export const CAMPUS_AREAS: Record<string, string> = {
  north: "North Campus",
  west: "West Campus",
  south: "South Campus",
  collegetown: "Collegetown",
  east: "East Campus",
  off_campus: "Off Campus",
};

export const WEEKDAYS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function campusLabel(area: string): string {
  return CAMPUS_AREAS[area] || area;
}

export function formatPrice(price: string | number): string {
  return `$${Number(price).toFixed(0)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
