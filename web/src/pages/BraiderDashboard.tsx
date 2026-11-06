import { useEffect, useState } from "react";
import {
  api,
  CAMPUS_AREAS,
  formatDate,
  formatPrice,
  formatTime,
  WEEKDAYS,
  type Booking,
  type Braider,
  type BraidStyle,
  type Listing,
} from "../lib/api";
import { StatusPill, Stars } from "../components/ui";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function BraiderDashboard() {
  const [tab, setTab] = useState<"requests" | "schedule" | "listings" | "profile">("requests");
  const [profile, setProfile] = useState<Braider | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [styles, setStyles] = useState<BraidStyle[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newStyle, setNewStyle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("180");
  const [newDesc, setNewDesc] = useState("");

  const load = () => {
    api.myBraiderProfile().then(setProfile).catch(() => setProfile(null));
    api.bookings().then(setBookings).catch(() => setBookings([]));
    api.myListings().then(setListings).catch(() => setListings([]));
    api.styles().then(setStyles).catch(() => setStyles([]));
  };
  useEffect(load, []);

  const act = async (id: number, action: "accept" | "decline" | "complete") => {
    setError("");
    try {
      await api.bookingAction(id, action);
      setNotice(
        action === "accept"
          ? "Booking accepted — it is on your schedule now."
          : action === "decline"
            ? "Booking declined."
            : "Marked complete — your client can now leave a review.",
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  };

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createListing({
        style: Number(newStyle),
        title: newTitle,
        description: newDesc,
        price: newPrice,
        duration_minutes: Number(newDuration),
      });
      setNotice("Listing published.");
      setNewTitle("");
      setNewDesc("");
      setNewPrice("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the listing.");
    }
  };

  const toggleListing = async (l: Listing) => {
    try {
      await api.updateListing(l.id, { is_active: !l.is_active });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the listing.");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError("");
    try {
      const updated = await api.updateBraiderProfile({
        display_name: profile.display_name,
        bio: profile.bio,
        campus_area: profile.campus_area,
        location_detail: profile.location_detail,
        instagram: profile.instagram,
        years_experience: profile.years_experience,
        available_days: profile.available_days,
        available_start_time: profile.available_start_time,
        available_end_time: profile.available_end_time,
      });
      setProfile(updated);
      setNotice("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the profile.");
    }
  };

  const toggleDay = (d: string) => {
    if (!profile) return;
    const days = profile.available_days.includes(d)
      ? profile.available_days.filter((x) => x !== d)
      : [...profile.available_days, d];
    setProfile({ ...profile, available_days: days });
  };

  const requests = bookings.filter((b) => b.status === "requested");
  const schedule = bookings.filter((b) => b.status === "accepted" || b.status === "completed");
  const done = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="page">
      <div className="wrap">
        <p className="eyebrow">Braider dashboard</p>
        <h1>
          {profile ? `${profile.display_name}’s chair` : "Your chair"}{" "}
          <Stars rating={profile?.average_rating ?? null} />
        </h1>
        <p className="muted">
          {done} completed appointment{done === 1 ? "" : "s"} ·{" "}
          {requests.length} request{requests.length === 1 ? "" : "s"} waiting
        </p>
        {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}
        {notice && <p className="notice" style={{ marginTop: "1rem" }}>{notice}</p>}

        <div className="tabs" style={{ marginTop: "1.5rem" }}>
          {(["requests", "schedule", "listings", "profile"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t === "requests" ? `Requests (${requests.length})` : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "requests" && (
          <div className="grid">
            {requests.length === 0 && <p className="muted">No requests waiting. When a client books you, it lands here.</p>}
            {requests.map((b) => (
              <article key={b.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3>{b.client_name}</h3>
                  <StatusPill status={b.status} />
                </div>
                <div className="meta">
                  {b.listing_title} · {b.style_name}
                </div>
                <div>
                  {formatDate(b.date)} at {formatTime(b.start_time)}–{formatTime(b.end_time)} ·{" "}
                  {formatPrice(b.price)}
                </div>
                {b.notes && <p className="muted">“{b.notes}”</p>}
                <div className="grow" />
                <div className="row" style={{ gap: "0.5rem" }}>
                  <button className="btn btn-sm" type="button" onClick={() => act(b.id, "accept")}>
                    Accept
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => act(b.id, "decline")}>
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "schedule" && (
          <div className="grid">
            {schedule.length === 0 && <p className="muted">Nothing on the schedule yet.</p>}
            {schedule.map((b) => (
              <article key={b.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3>{b.client_name}</h3>
                  <StatusPill status={b.status} />
                </div>
                <div className="meta">
                  {b.listing_title} · {b.style_name}
                </div>
                <div>
                  {formatDate(b.date)} at {formatTime(b.start_time)}–{formatTime(b.end_time)} ·{" "}
                  {formatPrice(b.price)}
                </div>
                {b.notes && <p className="muted">“{b.notes}”</p>}
                <div className="grow" />
                {b.status === "accepted" && (
                  <button className="btn btn-sm" type="button" onClick={() => act(b.id, "complete")}>
                    Mark complete
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {tab === "listings" && (
          <div className="stack">
            <form onSubmit={createListing} className="panel stack">
              <h2>Add a listing</h2>
              <div className="row">
                <div>
                  <label htmlFor="nl-title">Title</label>
                  <input id="nl-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Knotless Braids — mid-back" required />
                </div>
                <div>
                  <label htmlFor="nl-style">Style</label>
                  <select id="nl-style" value={newStyle} onChange={(e) => setNewStyle(e.target.value)} required>
                    <option value="">Pick a style…</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label htmlFor="nl-price">Price ($)</label>
                  <input id="nl-price" type="number" min={0} step="1" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="85" required />
                </div>
                <div>
                  <label htmlFor="nl-dur">Duration (minutes)</label>
                  <input id="nl-dur" type="number" min={15} step={15} value={newDuration} onChange={(e) => setNewDuration(e.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="nl-desc">Description (optional)</label>
                <input id="nl-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Hair included, mid-back length…" />
              </div>
              <button className="btn" type="submit">
                Publish listing
              </button>
            </form>
            <h2>Your listings</h2>
            {listings.length === 0 && <p className="muted">No listings yet — add your first one above.</p>}
            {listings.map((l) => (
              <div key={l.id} className="panel" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <strong>{l.title}</strong>
                  <div className="muted">
                    {l.style_name} · {formatPrice(l.price)} · {l.duration_minutes} min ·{" "}
                    {l.is_active ? "Live" : "Paused"}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleListing(l)}>
                  {l.is_active ? "Pause" : "Make live"}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && profile && (
          <form onSubmit={saveProfile} className="panel stack">
            <div className="row">
              <div>
                <label htmlFor="pf-name">Display name</label>
                <input id="pf-name" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pf-ig">Instagram (optional)</label>
                <input id="pf-ig" value={profile.instagram} onChange={(e) => setProfile({ ...profile, instagram: e.target.value })} placeholder="@your.handle" />
              </div>
            </div>
            <div>
              <label htmlFor="pf-bio">Bio</label>
              <textarea id="pf-bio" rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="What you do best, how long you have been braiding…" />
            </div>
            <div className="row">
              <div>
                <label htmlFor="pf-area">Campus area</label>
                <select id="pf-area" value={profile.campus_area} onChange={(e) => setProfile({ ...profile, campus_area: e.target.value })}>
                  <option value="">Pick an area…</option>
                  {Object.entries(CAMPUS_AREAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-loc">Where clients meet you</label>
                <input id="pf-loc" value={profile.location_detail} onChange={(e) => setProfile({ ...profile, location_detail: e.target.value })} placeholder="Dorm lounge, apartment…" />
              </div>
              <div>
                <label htmlFor="pf-yrs">Years braiding</label>
                <input id="pf-yrs" type="number" min={0} value={profile.years_experience} onChange={(e) => setProfile({ ...profile, years_experience: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label>Days you are usually free</label>
              <div className="day-pills">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="day-pill"
                    aria-pressed={profile.available_days.includes(d)}
                    onClick={() => toggleDay(d)}
                  >
                    {WEEKDAYS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <div>
                <label htmlFor="pf-start">Free from</label>
                <input id="pf-start" type="time" value={profile.available_start_time?.slice(0, 5) || ""} onChange={(e) => setProfile({ ...profile, available_start_time: e.target.value || null })} />
              </div>
              <div>
                <label htmlFor="pf-end">Free until</label>
                <input id="pf-end" type="time" value={profile.available_end_time?.slice(0, 5) || ""} onChange={(e) => setProfile({ ...profile, available_end_time: e.target.value || null })} />
              </div>
            </div>
            <button className="btn" type="submit">
              Save profile
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
