# Kormo Mela — Braids on Campus

A marketplace for braiding services for Black women on campus. Clients
find student braiders, see real prices and durations up front, and request
appointments. Braiders list their styles, manage requests, and build a
reputation through reviews. No more chasing DMs.

This is a rebuild of the original Kormo Mela Devpost project (a labor
marketplace linking consumers with verified workers via profiles, reviews,
and direct communication), with jem's twist: braiding services, by and for
students on campus.

## Stack

- **Backend:** Django 5 + Django REST Framework, token auth. SQLite by
  default, Postgres when `DATABASE_URL` is set.
- **Website:** Vite + React + TypeScript (`web/`), hash routing so it works
  as a plain static site. Talks to the Django API.
- **Mobile app:** Expo / React Native (`frontend/`), kept for future mobile
  work. The website is the primary deliverable.
- **Deploy:** `render.yaml` — Django web service + static frontend on Render.

## Run locally

Backend (Python 3.12):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo
.venv/bin/python manage.py runserver   # http://127.0.0.1:8000
```

Website:

```bash
cd web
npm install
npm run dev                            # http://localhost:5173
# or: npm run build && npx vite preview --port 4173
```

The website reads `VITE_API_URL` (default `http://localhost:8000/api`).
Docker: `docker compose up` runs Postgres + the backend.

## Demo accounts (password `demo1234` for all)

| Account | Role | Notes |
| --- | --- | --- |
| `client_demo` | Client | One upcoming + one completed booking |
| `client_new` | Client | Bare profile |
| `braider_demo` (Adaeze) | Braider | Knotless, box braids, cornrows |
| `braider_ada` (Zuri) | Braider | Cornrows, stitch braids, twists |
| `braider_zuri` (Mariam) | Braider | Faux locs, goddess braids, twists |
| `braider_new` | Braider | Bare profile |

All seeded braiders are flagged demo and shown with a **Demo profile**
badge. No real people are seeded.

## API

Base: `/api/`. Auth: `Authorization: Token <key>`.

- `POST /api/auth/register/` `{username, password, role: braider|client, display_name?}`
- `POST /api/auth/login/` → `{token, username, role, profile_id}`
- `GET /api/styles/` — braid styles (public)
- `GET /api/braiders/?style=&campus_area=` — public, paginated
- `GET /api/braiders/<id>/` — profile with listings + reviews (public)
- `GET /api/recommended/?style=&date=&max_price=` — ranked braiders with
  transparent match scores (availability / rating / price / experience)
- `GET /api/listings/?style=&braider=&max_price=&campus_area=` — public
- `POST /api/listings/` — braider only
- `GET /api/my-listings/` · `PATCH /api/listings/<id>/` — braider's own
- `GET /api/braiders/me/` · `PATCH /api/braiders/me/` — braider profile
- `GET /api/clients/me/` · `PATCH /api/clients/me/` — client profile
- `GET /api/bookings/?status=` · `POST /api/bookings/` `{listing, date, start_time, notes}`
- `POST /api/bookings/<id>/accept|decline|complete/` — braider; `cancel/` — client
- `POST /api/bookings/<id>/review/` `{rating 1-5, comment}` — client, completed only
- `GET /api/braiders/<id>/reviews/` — public

Booking rules: date cannot be in the past; a braider cannot be double-booked
(accepted bookings block overlapping times); reviews only after completion,
one per booking.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres URL (`postgres://user:pass@host:port/db`). Unset → SQLite |
| `DJANGO_SECRET_KEY` | Required in production (dev default is insecure) |
| `DJANGO_DEBUG` | `1`/`0`, default `1` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated, default `127.0.0.1,localhost,10.0.2.2` |
| `DJANGO_CORS_ALLOW_ALL` | `1`/`0`, default `1` when DEBUG else `0` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Comma-separated origins when not allow-all |
| `VITE_API_URL` | API base URL baked into the website build |

## Design

Warm, editorial, braid-inspired — not a generic marketplace template:
cream + espresso + gold + terracotta, Fraunces display type, a woven
three-strand braid band, initials avatars in warm tones. No photos: demo
profiles use initials, never scraped or real images.

## Tests

```bash
cd backend
.venv/bin/python manage.py test marketplace   # 10 tests
```
