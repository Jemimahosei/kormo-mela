import { Link } from "react-router-dom";
import {
  campusLabel,
  formatDuration,
  formatPrice,
  initials,
  type Braider,
  type Listing,
} from "../lib/api";

const AVATAR_TONES = ["#6b3049", "#4a2e1b", "#8a5a10", "#2f5d3a", "#7a3b1e", "#3d4a6b"];

export function toneFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span
      className={large ? "avatar avatar-lg" : "avatar"}
      style={{ background: toneFor(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function BraidBand() {
  return <div className="braid-band" aria-hidden="true" />;
}

export function DemoBadge() {
  return <span className="pill pill-demo">Demo profile</span>;
}

export function Stars({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="muted">New — no reviews yet</span>;
  }
  const full = Math.round(rating);
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="dim">{"★".repeat(5 - full)}</span> {rating.toFixed(1)}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}

export function BraiderCard({ braider }: { braider: Braider }) {
  const active = braider.listings.filter((l) => l.is_active);
  const from = active.length ? Math.min(...active.map((l) => Number(l.price))) : null;
  const styles = [...new Set(active.map((l) => l.style_name))];
  return (
    <article className="card">
      <div className="row" style={{ alignItems: "center", gap: "0.85rem" }}>
        <Avatar name={braider.display_name} />
        <div>
          <h3>
            <Link to={`/braiders/${braider.id}`}>{braider.display_name}</Link>
          </h3>
          <div className="meta">
            {braider.campus_area ? campusLabel(braider.campus_area) : "On campus"}
            {braider.years_experience > 0 && ` · ${braider.years_experience} yrs braiding`}
          </div>
        </div>
      </div>
      <div>
        {braider.is_demo && <DemoBadge />} <Stars rating={braider.average_rating} />
        {braider.review_count > 0 && (
          <span className="muted"> ({braider.review_count})</span>
        )}
      </div>
      {braider.match_score !== undefined && (
        <div className="muted">
          Match <strong>{braider.match_score}/100</strong>
          {braider.cheapest_listing && (
            <> · {braider.cheapest_listing.title} from {formatPrice(braider.cheapest_listing.price)}</>
          )}
        </div>
      )}
      <div className="chip-row">
        {styles.slice(0, 4).map((s) => (
          <span key={s} className="pill">
            {s}
          </span>
        ))}
      </div>
      <div className="grow" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="price">
          {from !== null ? (
            <>
              from {formatPrice(from)} <small>/ style</small>
            </>
          ) : (
            <small>No listings yet</small>
          )}
        </span>
        <Link to={`/braiders/${braider.id}`} className="btn btn-sm">
          View profile
        </Link>
      </div>
    </article>
  );
}

export function ListingRow({ listing }: { listing: Listing }) {
  return (
    <div className="panel" style={{ padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <strong>{listing.title}</strong>
          <div className="muted">
            {listing.style_name} · {formatDuration(listing.duration_minutes)}
            {listing.description ? ` — ${listing.description}` : ""}
          </div>
        </div>
        <span className="price">{formatPrice(listing.price)}</span>
      </div>
    </div>
  );
}
