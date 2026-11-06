import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, CAMPUS_AREAS, type Braider, type BraidStyle } from "../lib/api";
import { BraiderCard } from "../components/ui";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [styles, setStyles] = useState<BraidStyle[]>([]);
  const [results, setResults] = useState<Braider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const style = params.get("style") || "";
  const date = params.get("date") || "";
  const campus = params.get("campus_area") || "";
  const maxPrice = params.get("max_price") || "";

  useEffect(() => {
    api.styles().then(setStyles).catch(() => setStyles([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const run = async () => {
      try {
        if (style && date) {
          const ranked = await api.recommended({
            style,
            date,
            ...(maxPrice ? { max_price: maxPrice } : {}),
          });
          setResults(ranked);
        } else {
          const q: Record<string, string> = {};
          if (style) q.style = style;
          if (campus) q.campus_area = campus;
          const list = await api.braiders(q);
          setResults(
            maxPrice ? list.filter((b) => b.listings.some((l) => l.is_active && Number(l.price) <= Number(maxPrice))) : list,
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load braiders.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [style, date, campus, maxPrice]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <div className="page">
      <div className="wrap">
        <p className="eyebrow">Browse braiders</p>
        <h1>Find your braider</h1>
        <p className="lede">
          {style && date
            ? `Ranked for ${style} on ${date} — availability, reviews, price and experience all counted.`
            : "Filter by style, place, or budget. Pick a date too and we will rank braiders for that day."}
        </p>

        <div className="panel stack" style={{ marginTop: "1.5rem" }}>
          <div className="row">
            <div>
              <label htmlFor="f-style">Style</label>
              <select id="f-style" value={style} onChange={(e) => set("style", e.target.value)}>
                <option value="">Any style</option>
                {styles.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-date">Date</label>
              <input id="f-date" type="date" value={date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label htmlFor="f-area">Campus area</label>
              <select id="f-area" value={campus} onChange={(e) => set("campus_area", e.target.value)}>
                <option value="">Anywhere on campus</option>
                {Object.entries(CAMPUS_AREAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-price">Max price ($)</label>
              <input
                id="f-price"
                type="number"
                min={0}
                placeholder="No limit"
                value={maxPrice}
                onChange={(e) => set("max_price", e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}
        {loading ? (
          <p className="muted" style={{ marginTop: "1.5rem" }}>Loading braiders…</p>
        ) : results.length === 0 ? (
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            Nobody matches that yet. Try widening the style or budget — or{" "}
            <a href="#/signup?role=braider">list your own chair</a>.
          </p>
        ) : (
          <div className="grid" style={{ marginTop: "1.5rem" }}>
            {results.map((b) => (
              <BraiderCard key={b.id} braider={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
