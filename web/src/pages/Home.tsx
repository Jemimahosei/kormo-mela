import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Braider, type BraidStyle } from "../lib/api";
import { BraidBand, BraiderCard } from "../components/ui";

export default function Home() {
  const [styles, setStyles] = useState<BraidStyle[]>([]);
  const [featured, setFeatured] = useState<Braider[]>([]);
  const [style, setStyle] = useState("");
  const [date, setDate] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.styles().then(setStyles).catch(() => setStyles([]));
    api.braiders({}).then(setFeatured).catch(() => setFeatured([]));
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (style) q.set("style", style);
    if (date) q.set("date", date);
    navigate(`/browse${q.toString() ? `?${q}` : ""}`);
  };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Kormo Mela · Cornell campus</p>
          <h1>
            Good braids, <em>booked</em> like you mean it.
          </h1>
          <p>
            Student braiders on campus, real prices up front, no more chasing DMs.
            Find your braider, pick a style and a day — and show up knowing
            exactly what it costs and how long it takes.
          </p>
          <form className="hero-search" onSubmit={search}>
            <select aria-label="Style" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">Any style</option>
              {styles.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button className="btn btn-gold" type="submit">
              Find a braider →
            </button>
          </form>
          <BraidBand />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">Styles</p>
          <h2>What are you getting done?</h2>
          <div className="chip-row" style={{ marginTop: "1rem" }}>
            {styles.map((s) => (
              <Link key={s.id} className="chip" to={`/browse?style=${encodeURIComponent(s.name)}`}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <BraidBand />
      </div>

      <section className="section">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p className="eyebrow">Braiders on campus</p>
              <h2>Meet the chairs</h2>
            </div>
            <Link to="/browse" className="btn btn-ghost btn-sm">
              Browse all →
            </Link>
          </div>
          <div className="grid" style={{ marginTop: "1.5rem" }}>
            {featured.slice(0, 3).map((b) => (
              <BraiderCard key={b.id} braider={b} />
            ))}
          </div>
          {featured.length === 0 && (
            <p className="muted">No braiders listed yet — be the first.</p>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream-2)" }}>
        <div className="wrap">
          <p className="eyebrow">How it works</p>
          <h2>Three steps to fresh braids</h2>
          <div className="grid" style={{ marginTop: "1.5rem" }}>
            <div className="card">
              <h3>1 · Find your braider</h3>
              <p className="grow">
                Browse by style, price, and campus area. Every listing shows the
                real price and how long the appointment takes — no surprises.
              </p>
            </div>
            <div className="card">
              <h3>2 · Request a day</h3>
              <p className="grow">
                Pick a date and time that works. The braider accepts or declines,
                and you both see the same booking — no lost DMs.
              </p>
            </div>
            <div className="card">
              <h3>3 · Sit, get braided</h3>
              <p className="grow">
                Show up, get your hair done, and leave a review when it is
                finished so the next person knows what to expect.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="panel" style={{ background: "var(--espresso)", color: "var(--cream)", border: "none" }}>
            <h2 style={{ color: "var(--cream)" }}>You braid? List your chair.</h2>
            <p style={{ color: "#e8dcc4" }}>
              You already do hair for friends between classes. Put your styles
              and prices up, take requests on your own schedule, and get found
              by the whole campus.
            </p>
            <Link to="/signup?role=braider" className="btn btn-gold">
              Sign up as a braider →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
