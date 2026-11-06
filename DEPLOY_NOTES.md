# Kormo Mela rebuild — deploy notes for the parent

## What was built (Nov 5–6, 2026, overnight)

The partial generic labor marketplace was rebuilt into the braiding
marketplace jem asked for. Everything is in
`/home/hatch/workspace/projects/kormo-mela/`.

### Backend — Django REST API (`backend/`, rewritten domain)

Models (new migration `0001_initial`, plus `0002` Meta ordering):
`BraidStyle`, `BraiderProfile` (bio, campus area, availability days/times,
`is_demo` flag), `ClientProfile`, `Listing` (style + price + duration),
`Booking` (requested → accepted → declined/completed/cancelled),
`Review` (one per completed booking).

- Auth: token auth, register as `braider` or `client`.
- Recommendations (`marketplace/matching.py`): transparent 0–100 score —
  availability 40 / rating 30 / price 20 / experience 10 — via
  `GET /api/recommended/?style=&date=&max_price=`.
- Booking guards: past dates rejected, accepted bookings block overlapping
  times for the same braider, only the owning braider/client can act,
  reviews only after completion.
- CORS: `marketplace/cors.py` (minimal middleware — `django-corsheaders`
  is **not installable** from the available package index: pip reports
  "No matching distribution found". Do not add it to requirements.)
- `requirements.txt` now pins `django>=5.0,<6.0` (pip installed 6.1.3
  unpinned; the code was built against 5.x — 5.2.19 verified) and adds
  `gunicorn` for Render.
- Seed (`seed_demo`): 8 styles, 3 demo braiders (Adaeze/Zuri/Mariam,
  `is_demo=True`), 9 listings, demo client with one accepted + one
  completed booking. No real people, no invented testimonials — zero
  reviews are seeded; braiders show "New — no reviews yet".

### Website — Vite + React + TS (`web/`, new)

- Hash routing (works as a plain static site, no server rewrites).
- Pages: Home (hero + style search + featured braiders + how it works),
  Browse (style/date/area/budget filters; ranked recommendations when
  style+date are set), Braider profile (listings, reviews, booking form),
  Login/Signup (role picker, one-tap demo logins), Client dashboard
  (my bookings, cancel, review completed bookings), Braider dashboard
  (requests accept/decline, schedule + mark complete, listings create/
  pause, profile editor with availability days).
- Design: cream/espresso/gold/terracotta, Fraunces + Instrument Sans
  (bundled via @fontsource), woven three-strand braid band (inline SVG),
  initials avatars. No photos anywhere.

### Expo app (`frontend/`) — decision, tested

The Expo web-export path was tried first, as instructed:
1. `npx expo install react-dom react-native-web @expo/metro-runtime`
   (first attempt hit a TLS timeout through the proxy; retry succeeded).
2. `npx expo export --platform web` on the existing app **works** — the
   blank template exports cleanly to `frontend/dist/`.
3. Verdict: **Vite web app built instead.** The Expo app is still the
   blank template — building the full editorial UI in React Native Web
   (StyleSheet-only styling, no CSS braid patterns, expo-router
   restructure) is the slower, riskier route for a website-first
   deliverable. The Expo app is untouched and still works (template +
   web deps installed) for future mobile work. `frontend/dist/` is
   gitignored build output.

### Repo/deploy files

- `render.yaml` at project root: `kormo-mela-backend` (Python, gunicorn,
  `migrate && seed_demo` on start) + `kormo-mela-frontend` (static,
  `web/dist`). `DATABASE_URL` is `sync: false` — set by hand in Render.
- `README.md` at project root. `docker-compose.yml` (Postgres + backend)
  left as-is for local Docker dev.

## Verification (all in this VM)

- `manage.py check`: no issues. `manage.py test marketplace`: **10/10 pass**
  (full booking flow, permission guards, double-booking block, past-date
  rejection, recommendation scoring).
- Live server + curl end-to-end: login (braider_demo, client_demo) →
  public braiders list (4) → recommended knotless for Sat Nov 7 (Adaeze,
  81/100) → booking request → accept → complete → 5★ review → braider
  rated 5.0 (1 review). Overlap: 201 while only requested, 400 once
  accepted. CORS preflight: 200 with `Access-Control-Allow-Origin: *`.
  New braider signup + listing create: 201.
- `npm run build` in `web/`: **passes, tsc + vite, zero warnings**
  (297 KB JS gzip 91 KB). Served `vite preview` on :4173: index.html
  200 with correct title, JS bundle 200, CSS 200.
- Dev DB was reset to clean seed state after verification
  (rm db.sqlite3 → migrate → seed_demo).
- **Not verified:** the UI in a real browser (no browser tool in this
  session). The parent should click through the live site after deploy:
  demo logins, booking flow, dashboards.

## Deploy steps for the parent

1. Create the GitHub repo (the Muse GitHub App cannot create repos —
   create it via the browser as jem, then add it to the app installation
   like Gradebook-Ghana) and snapshot-push the project (text files only;
   `node_modules/`, `dist/`, `.venv/`, `db.sqlite3`, `__pycache__` are
   gitignored — verify the push manifest excludes them).
2. Render: create a Blueprint from the repo (uses `render.yaml`).
   First deploy seeds the demo data automatically.
3. **Check the backend URL.** Render may suffix it (like Gradebook's
   `-0l4v`). If `https://kormo-mela-backend.onrender.com` is not the real
   URL, update `VITE_API_URL` in `render.yaml`, push, and redeploy the
   frontend (the API URL is baked in at build time).
4. **Database:** with no `DATABASE_URL`, Render runs on SQLite, which is
   ephemeral — redeploys wipe user data. For real users, create a Neon
   Postgres database and paste its direct (non-pooled) connection string
   into the backend service's `DATABASE_URL` in the Render dashboard,
   then redeploy the backend.
5. Set a real `DJANGO_SECRET_KEY` in production (render.yaml generates
   one) and consider `DJANGO_CORS_ALLOW_ALL=0` with
   `DJANGO_CORS_ALLOWED_ORIGINS=https://<frontend-url>` once the frontend
   URL is known.
6. Verify live: open the frontend, demo-login as `client_demo` /
   `demo1234`, request a booking, demo-login as `braider_demo`, accept it.
   Free tier sleeps when idle — first load can take ~50s.

## Known limits / next steps (not built)

- No payments — bookings are requests, money is handled off-platform
  (by design for the MVP).
- No email/SMS notifications — braiders must check the dashboard.
- No photo uploads — avatars are initials by design.
- No real braiders — all seeded profiles are demo; real signups start
  with empty profiles/listings.
- Mobile (Expo) app is still the blank template; the website is the
  deliverable.
