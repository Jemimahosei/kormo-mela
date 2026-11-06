import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  campusLabel,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
  WEEKDAYS,
  type Braider,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { Avatar, DemoBadge, ListingRow, Stars } from "../components/ui";

export default function BraiderDetail() {
  const { id } = useParams();
  const [braider, setBraider] = useState<Braider | null>(null);
  const [error, setError] = useState("");
  const [listingId, setListingId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingErr, setBookingErr] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api
      .braider(id)
      .then((b) => {
        setBraider(b);
        const first = b.listings.find((l) => l.is_active);
        if (first) setListingId(String(first.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load this braider."));
  }, [id]);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingErr("");
    setBookingMsg("");
    if (!user) {
      navigate(`/login?next=/braiders/${id}`);
      return;
    }
    if (user.role !== "client") {
      setBookingErr("Only client accounts can book. Log in as a client to request this appointment.");
      return;
    }
    try {
      const booking = await api.createBooking({
        listing: Number(listingId),
        date,
        start_time: time,
        notes,
      });
      setBookingMsg(
        `Request sent for ${formatDate(booking.date)} at ${formatTime(booking.start_time)}. ${braider?.display_name} will accept or decline — watch your dashboard.`,
      );
    } catch (err) {
      setBookingErr(err instanceof Error ? err.message : "Booking failed.");
    }
  };

  if (error) return <div className="page"><div className="wrap"><p className="error">{error}</p></div></div>;
  if (!braider) return <div className="page"><div className="wrap"><p className="muted">Loading…</p></div></div>;

  const activeListings = braider.listings.filter((l) => l.is_active);
  const days = braider.available_days.map((d) => WEEKDAYS[d] || d).join(" · ");

  return (
    <div className="page">
      <div className="wrap">
        <Link to="/browse">← All braiders</Link>
        <div className="row" style={{ marginTop: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ flex: "2 1 480px" }} className="stack">
            <div className="panel">
              <div className="row" style={{ alignItems: "center" }}>
                <Avatar name={braider.display_name} large />
                <div>
                  <h1>{braider.display_name}</h1>
                  <div className="meta">
                    {braider.campus_area ? campusLabel(braider.campus_area) : "On campus"}
                    {braider.location_detail ? ` · ${braider.location_detail}` : ""}
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    {braider.is_demo && <DemoBadge />} <Stars rating={braider.average_rating} />
                    {braider.review_count > 0 && <span className="muted"> ({braider.review_count} reviews)</span>}
                  </div>
                </div>
              </div>
              {braider.bio && <p style={{ marginTop: "1rem" }}>{braider.bio}</p>}
              <dl className="kv" style={{ marginTop: "1rem" }}>
                <dt>Experience</dt>
                <dd>{braider.years_experience} {braider.years_experience === 1 ? "year" : "years"} braiding</dd>
                <dt>Usually free</dt>
                <dd>
                  {days || "Days not set"}
                  {braider.available_start_time && braider.available_end_time && (
                    <> · {formatTime(braider.available_start_time.slice(0, 5))}–{formatTime(braider.available_end_time.slice(0, 5))}</>
                  )}
                </dd>
                {braider.instagram && (
                  <>
                    <dt>Instagram</dt>
                    <dd>{braider.instagram}</dd>
                  </>
                )}
              </dl>
            </div>

            <h2>Styles &amp; prices</h2>
            {activeListings.length === 0 ? (
              <p className="muted">No listings yet.</p>
            ) : (
              <div className="stack">
                {activeListings.map((l) => (
                  <ListingRow key={l.id} listing={l} />
                ))}
              </div>
            )}

            <h2>Reviews</h2>
            {braider.reviews.length === 0 ? (
              <p className="muted">No reviews yet — be the first to book and leave one.</p>
            ) : (
              <div className="stack">
                {braider.reviews.map((r) => (
                  <div key={r.id} className="panel">
                    <Stars rating={r.rating} /> <strong>{r.client_name}</strong>
                    {r.comment && <p style={{ margin: "0.4rem 0 0" }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 320px" }}>
            <div className="panel stack" style={{ position: "sticky", top: "90px" }}>
              <h2>Book an appointment</h2>
              {activeListings.length === 0 ? (
                <p className="muted">This braider has no bookable listings right now.</p>
              ) : (
                <form onSubmit={book} className="stack">
                  <div>
                    <label htmlFor="bk-listing">Style</label>
                    <select id="bk-listing" value={listingId} onChange={(e) => setListingId(e.target.value)}>
                      {activeListings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} — {formatPrice(l.price)} · {formatDuration(l.duration_minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <div>
                      <label htmlFor="bk-date">Date</label>
                      <input id="bk-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="bk-time">Start time</label>
                      <input id="bk-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bk-notes">Notes for your braider (optional)</label>
                    <textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Length, color, inspo — anything she should know." />
                  </div>
                  {bookingErr && <p className="error">{bookingErr}</p>}
                  {bookingMsg && <p className="notice">{bookingMsg}</p>}
                  <button className="btn" type="submit">
                    {user ? "Request this appointment" : "Log in to request"}
                  </button>
                  {!user && (
                    <p className="muted">
                      New here? <Link to={`/signup?role=client&next=/braiders/${id}`}>Create a free client account</Link>.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
