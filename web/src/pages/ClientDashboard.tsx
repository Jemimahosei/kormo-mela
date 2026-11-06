import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate, formatPrice, formatTime, type Booking } from "../lib/api";
import { StatusPill, Stars } from "../components/ui";

export default function ClientDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewFor, setReviewFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const load = () => {
    api
      .bookings()
      .then(setBookings)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load bookings."));
  };
  useEffect(load, []);

  const cancel = async (id: number) => {
    setError("");
    try {
      await api.bookingAction(id, "cancel");
      setNotice("Booking cancelled.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    }
  };

  const submitReview = async (id: number) => {
    setError("");
    try {
      await api.reviewBooking(id, rating, comment);
      setNotice("Review posted — thank you.");
      setReviewFor(null);
      setComment("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed.");
    }
  };

  const upcoming = bookings.filter((b) => b.status === "requested" || b.status === "accepted");
  const past = bookings.filter((b) => !["requested", "accepted"].includes(b.status));

  const bookingCard = (b: Booking) => (
    <article key={b.id} className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <h3>
          <Link to={`/braiders/${b.braider_id}`}>{b.braider_name}</Link>
        </h3>
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
        {(b.status === "requested" || b.status === "accepted") && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => cancel(b.id)}>
            Cancel booking
          </button>
        )}
        {b.status === "completed" && reviewFor !== b.id && (
          <button className="btn btn-sm" type="button" onClick={() => setReviewFor(b.id)}>
            Leave a review
          </button>
        )}
      </div>
      {reviewFor === b.id && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submitReview(b.id);
          }}
        >
          <div>
            <label>Rating</label>
            <div className="chip-row">
              {[5, 4, 3, 2, 1].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                >
                  {"★".repeat(n)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`c-${b.id}`}>What should the next person know?</label>
            <textarea
              id={`c-${b.id}`}
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Neat parts, on time, gentle hands…"
            />
          </div>
          <button className="btn btn-sm" type="submit">
            Post review
          </button>
        </form>
      )}
    </article>
  );

  return (
    <div className="page">
      <div className="wrap">
        <p className="eyebrow">My bookings</p>
        <h1>Your appointments</h1>
        {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}
        {notice && <p className="notice" style={{ marginTop: "1rem" }}>{notice}</p>}
        <h2 style={{ marginTop: "1.5rem" }}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="muted">
            Nothing booked yet. <Link to="/browse">Find a braider →</Link>
          </p>
        ) : (
          <div className="grid" style={{ marginTop: "1rem" }}>{upcoming.map(bookingCard)}</div>
        )}
        <h2 style={{ marginTop: "2rem" }}>Past</h2>
        {past.length === 0 ? (
          <p className="muted">No past appointments.</p>
        ) : (
          <div className="grid" style={{ marginTop: "1rem" }}>{past.map(bookingCard)}</div>
        )}
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Stars rating={null} /> Reviews only open up after a booking is completed.
        </p>
      </div>
    </div>
  );
}
