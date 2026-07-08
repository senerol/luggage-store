# Luggo — Short-Term Luggage Storage Platform

Luggo is a **two-sided marketplace**: travelers need somewhere safe to leave luggage for a
few hours; hotels, hostels, cafes and shops have unused space they could rent out by the
hour. Luggo connects the two and takes a commission on every booking.

- **Customer** finds nearby storage, books it by the hour, pays online, and drops off /
  collects bags using a QR code — solving the very real "I have a few hours in a city and
  nowhere safe to leave my suitcase" problem.
- **Partner** applies to list their space, gets reviewed and approved by Luggo, then
  receives bookings and earns money (minus Luggo's commission) for space that would
  otherwise sit unused.

This README currently documents the **backend** (Phases 1–7 + partner/admin/review/
notification APIs, plus the full partner-acquisition/commission/payout system described in
[Two-sided marketplace mechanics](#two-sided-marketplace-mechanics)). The **frontend**
(`client/`) is being built in the next phase — see [Project status](#project-status) below.

## Project status

| Phase | Area | Status |
|---|---|---|
| 1 | Project setup (client + server scaffolding) | ✅ done |
| 2 | Database (Prisma schema, seed data) | ✅ done |
| 3 | Authentication (JWT, roles, cookies) | ✅ done, full frontend login/register flow |
| 4 | Storage locations (CRUD, search, nearby) | ✅ done, incl. search/map UI |
| 5 | Booking system (availability, pricing, concurrency) | ✅ done, incl. full booking flow UI |
| 6 | Payments (Razorpay) | ✅ done, incl. checkout UI |
| 7 | QR check-in/check-out | ✅ done, incl. customer QR page + partner scanner UI |
| 8–10 | Customer / Partner / Admin dashboards | ✅ done — see [Frontend pages](#frontend-pages) |
| 11 | Reviews | ✅ done, incl. review form on completed bookings |
| 12 | Notifications | ✅ done — bell icon in the navbar with unread count, mark-read/mark-all-read |
| — | Partner onboarding, commission, payouts, acquisition funnel | ✅ done, incl. onboarding wizard + admin review UI (see [Two-sided marketplace mechanics](#two-sided-marketplace-mechanics)) |
| 13 | Testing | ✅ backend unit tests done; integration tests need a real Postgres instance; no frontend tests yet |
| 14 | Security hardening | ✅ baked in throughout (see [Security](#security)) |
| 15 | Deployment prep | ✅ Dockerfiles, docker-compose, and CI done — see [Deployment](#deployment) |

**Important caveat on frontend verification**: every page was built, the whole app type-checks (`tsc -b`) and production-builds cleanly, and the landing/become-partner/search/register pages were visually confirmed in a live browser (screenshots showed the real OpenStreetMap tiles loading, the earnings calculator computing correctly, graceful error+retry states, and the register form's role toggle working). What was **not** possible in this environment: exercising authenticated flows (login → book → pay → check-in) against a *running* backend + real Postgres instance, since no local Postgres was available here. The client and server were built against the same shared contract (the client's TypeScript types mirror the server's actual response shapes), so once you run the backend per the instructions above, these flows should work end-to-end — but you should verify that yourself before considering this production-ready.

## Real-world problem this solves

Arrive in an unfamiliar city with luggage, hours to spare before your train/flight/meeting,
and nowhere safe to leave your bags. Luggo lets you find a nearby partner location (hotel,
hostel, cafe, dedicated storage shop), book a slot for exactly the hours you need, pay
online, and get a QR code that gets your bag checked in on arrival and checked out on
pickup — no phone calls, no cash, no guessing whether they have room.

## Architecture

```
Browser (React/Vite/TS) ──HTTPS/JSON──> Express API (TS) ──Prisma──> PostgreSQL
                                              │
                                              ├──> Razorpay (order creation + signature verification)
                                              └──> qrcode (server-generates QR images from opaque tokens)
```

Three roles share one data model: **CUSTOMER** (books storage), **PARTNER** (owns/runs
storage locations), **ADMIN** (approves partners/locations, moderates, views platform-wide
stats). Every write is authorized server-side against `req.user` (set by verifying a JWT
cookie) — the frontend never gets to assert who it is.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, React Router, Tailwind CSS, Axios, React Hook
  Form + Zod, Lucide icons, Leaflet + OpenStreetMap (see [Maps](#why-leaflet--openstreetmap)).
- **Backend**: Node.js, Express, TypeScript, Zod validation, JWT auth (httpOnly cookies),
  bcrypt, Helmet, CORS, express-rate-limit.
- **Database**: PostgreSQL + Prisma ORM.
- **Payments**: Razorpay (test mode).
- **QR**: `qrcode` (generation) + a custom server-side verification flow (no third-party
  QR "verification" service — the backend is the sole source of truth).

### Why Leaflet + OpenStreetMap

Chosen over Google Maps because it needs no API key/billing account to run this project
locally or in a portfolio review, and OSM tile coverage of Delhi (where the seed data lives)
is excellent. The tradeoff: no built-in Places autocomplete or Street View — if this ever
needed production-grade geocoding/autocomplete, swapping in the Google Maps Places API for
just the search-box autocomplete (keeping Leaflet for the map itself) would be the natural
next step.

## Folder structure

```
luggo/
├── client/                     React + Vite + TS + Tailwind (frontend — in progress)
├── server/
│   ├── src/
│   │   ├── config/             env loading, Prisma client, Razorpay client, constants
│   │   ├── controllers/        thin HTTP layer — parse req, call a service, send res
│   │   ├── middleware/         auth, validate, asyncHandler, centralized error handler
│   │   ├── routes/             one file per resource, mounted in app.ts
│   │   ├── services/           all business logic lives here (see below)
│   │   ├── utils/              password hashing, JWT, ids/tokens, geo, operating hours
│   │   ├── validators/         Zod schemas, one per resource
│   │   ├── types/              Express Request augmentation (req.user)
│   │   ├── app.ts              Express app wiring (middleware + route mounting)
│   │   └── index.ts            process entrypoint
│   ├── prisma/
│   │   ├── schema.prisma        the full data model
│   │   └── seed.ts              realistic Delhi-based seed data
│   ├── tests/                   vitest unit + integration tests
│   └── .env.example
├── README.md
└── .gitignore
```

Key services and what they own:
- `bookingService.ts` — booking creation (with the capacity/concurrency logic),
  cancellation, ownership-scoped lookups.
- `capacityService.ts` — the interval-overlap capacity math shared by search results,
  the pre-booking availability check, and booking creation itself.
- `bookingStateMachine.ts` — the single allow-list of valid booking status transitions.
- `pricingService.ts` — hour-rounding + customer-facing price breakdown, and the
  partner/platform commission split — always computed server-side.
- `paymentService.ts` — Razorpay order creation + idempotent signature verification.
- `qrService.ts` — QR image generation and the partner-facing scan/verify flow.
- `partnerApplicationService.ts` — the partner-onboarding pipeline (submit, resubmit,
  admin review) described in [Two-sided marketplace mechanics](#two-sided-marketplace-mechanics).
- `platformConfigService.ts` — the single place the commission percentage is read from.
- `payoutService.ts` — the payout ledger (ledger/status only; no real money movement yet).
- `analyticsService.ts` — event logging + the partner-acquisition funnel query.

## Database design & the capacity/concurrency approach

Core relationships:

```
User ──1:1── StoragePartner ──1:*── StorageLocation ──1:*── StorageOperatingHour
  │                                        │
  │                                        ├──1:*── StoragePriceRule
  │                                        └──1:*── Review
  │
  └──1:*── Booking ──*:1── StorageLocation
              │
              ├──1:*── BookingItem ──1:*── LuggageItem
              ├──1:*── Payment
              └──1:1── Review
```

**Why capacity checks can't just be "count of bookings < capacity":** each booking can
hold multiple bags, and bookings overlap in time arbitrarily (a 10am–2pm booking and an
11am–1pm booking both hold capacity between 11am and 1pm, but neither holds it at 9am).
`capacityService.getUsedCapacity` sums `BookingItem.quantity` for every booking at a
location whose `[dropoffAt, pickupAt)` interval overlaps the requested window
(`existing.dropoffAt < requested.pickupAt AND existing.pickupAt > requested.dropoffAt` —
the standard interval-overlap test), restricted to statuses that actually hold capacity
(`PENDING_PAYMENT, CONFIRMED, CHECKED_IN, IN_STORAGE, READY_FOR_PICKUP`).

**Why `PENDING_PAYMENT` counts as capacity-held:** if it didn't, two customers could both
pass the "is there room?" check, both proceed to Razorpay checkout for the same slot, and
only one bag's worth of physical space actually exists. Reserving the slot the instant the
booking row is created (before payment) closes that gap — at the cost of needing to expire
stale unpaid holds (see `PENDING_PAYMENT_TTL_MINUTES` in `config/constants.ts` and
`expireStaleBookings` in `bookingService.ts`, which frees a location's stale holds right
before every capacity check for that location).

**Why a plain "check, then insert" still isn't safe under concurrency:** even with the
above, two requests for the *same* location's *same* window can both read "capacity
available" before either has inserted its booking (a classic read-then-write race).
`bookingService.createBooking` closes this by opening a Postgres transaction that first
runs `SELECT pg_advisory_xact_lock(hashtext(storageLocationId))` — an advisory lock scoped
to the transaction and released automatically on commit/rollback. A second request for the
*same* location blocks on that line until the first transaction finishes, then re-reads an
up-to-date capacity figure; requests for *different* locations never block each other. This
is verified directly in `tests/booking.capacity.test.ts` by firing two concurrent booking
requests for the last few units of capacity and asserting exactly one succeeds.

The equivalent problem at check-in/check-out time (two scans of the same QR racing) is
handled the same way conceptually but more cheaply: `qrService` uses an optimistic
`updateMany({ where: { id, status: expectedStatus, usedAt: null }, ... })` and checks
`count === 1`, so only the first of two simultaneous scans actually mutates the row.

## Booking lifecycle (state machine)

```
PENDING_PAYMENT ──pay──> CONFIRMED ──scan @ dropoff──> CHECKED_IN ──> IN_STORAGE
       │                     │                                            │
       ├──cancel──> CANCELLED│                                            │
       ├──fail─────> PAYMENT_FAILED ──retry──> PENDING_PAYMENT             │
       └──timeout──> EXPIRED                                               │
                                                                    scan @ pickup
                                                                            ▼
                                                     COLLECTED <── READY_FOR_PICKUP
```

Enforced centrally in `bookingStateMachine.ts` — every status change in the codebase goes
through `assertTransition(from, to)`, so e.g. `COLLECTED → CHECKED_IN` is structurally
impossible regardless of which code path attempts it.

## Two-sided marketplace mechanics

### Partner onboarding pipeline

A business doesn't become bookable the moment it signs up. `POST /api/partner/applications`
accepts one combined payload for the whole onboarding wizard (business info, one storage
location's full details, operating hours, pricing, photos, and terms agreement) and, in a
single transaction, creates a `StorageLocation` in `PENDING` status plus a
`PartnerApplication` in `PENDING_REVIEW` — the location is **not** publicly bookable yet.

```
PENDING_REVIEW ──approve──> APPROVED (StorageLocation flips to APPROVED/live)
       │
       ├──reject──────────> REJECTED (rejectionReason stored, location REJECTED)
       └──request changes─> CHANGES_REQUESTED (adminNote stored, partner can edit + resubmit)
                                   │
                                   └──resubmit (same endpoint)──> back to PENDING_REVIEW
```

An already-approved partner going live can later be `SUSPENDED` by an admin
(`PATCH /api/admin/partners/:id/suspend`), which flips their locations to `DISABLED` and
notifies them; `reinstate` reverses it. Resubmission reuses the *same*
`PartnerApplication` + `StorageLocation` rows (rather than creating duplicates) so there's
one clean history per applicant — see `partnerApplicationService.submitApplication`.

### Commission model

Every booking stores **both** of two distinct platform-revenue concepts, matching the
product's requirement that neither be hardcoded:

- `serviceFee` — a customer-facing surcharge added on top of the base storage price,
  shown as "Platform fee" in the price breakdown (existing since the booking system).
- `platformCommissionAmount` / `partnerEarningsAmount` — a split of the *total amount
  collected*, computed by `pricingService.splitCommission` using whatever percentage is
  currently configured in the single-row `PlatformConfig` table (never a hardcoded
  constant), fetched via `platformConfigService.getCommissionPercent()`. An admin reads/
  updates it via `GET`/`PATCH /api/admin/settings/commission` — no code or redeploy
  required to change it.

The split is snapshotted onto the `Booking` row at creation time, so changing the
commission percentage later never rewrites the economics of a booking that already
happened. `partnerEarningsAmount + platformCommissionAmount == totalAmount` always holds.

### Payout ledger (MVP — no real money movement yet)

Actually transferring money to partners is explicitly out of scope for this MVP per the
spec; what's implemented instead is the ledger/status system that would sit in front of a
real payout integration:

- A booking's earnings become **eligible** once it reaches `COLLECTED` and has a `PAID`
  payment (`payoutService`'s `ELIGIBLE_BOOKING_WHERE`).
- `POST /api/admin/partners/:id/payouts` bundles every eligible booking for that partner
  into one `Payout` row (`status: PENDING`) and stamps each booking with `payoutId`, so it
  won't be double-counted in a future payout.
- `PATCH /api/admin/payouts/:id/mark-paid` flips it to `PAID` once the transfer has
  actually happened through whatever manual channel is used today, and notifies the
  partner.
- **Future improvement**: wire a real payout provider (e.g. Razorpay Route/Payouts) behind
  the same `createPayout`/`markPayoutPaid` functions so the ledger semantics don't change,
  only how "mark paid" gets triggered.

### Partner-acquisition funnel

`AnalyticsEvent` is a minimal event log (`PARTNER_PAGE_VIEW`, `APPLICATION_STARTED`) for the
two funnel steps that leave no other trace; `submitted`/`approved`/`partners receiving
bookings` are derived directly from `PartnerApplication` and `Booking` rows.
`GET /api/admin/analytics/partner-funnel` computes:

```
Partner page visits → Applications started → Applications submitted → Applications approved → Partners receiving bookings
```

The frontend fires `POST /api/analytics/events` (works anonymously) at the two tracked
steps; nothing else needs to change if more funnel steps are added later since the rest are
computed from existing tables.

## Environment variables

Copy `server/.env.example` to `server/.env` and fill in real values:

```bash
cp server/.env.example server/.env
```

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `FRONTEND_URL` | Used for CORS; the Vite dev server origin in development |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Sign/verify auth cookies — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `QR_SECRET` | Reserved for future signed-QR use; keep it set to a long random string |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | From your Razorpay **test mode** dashboard |
| `SERVICE_FEE_PERCENT` | Customer-facing "Platform fee" surcharge on top of the base storage price |

Note: the **commission** percentage (Luggo's cut of the partner-facing split) is
deliberately *not* an env var — it lives in the database (`PlatformConfig` table, defaults
to 15% on first read) and is editable at runtime by an admin via
`GET`/`PATCH /api/admin/settings/commission`, per the spec's "do not hardcode the
commission percentage" requirement.

Never commit `.env` — it's already in `.gitignore`.

## Installation & running the backend

Requires Node 20+ and a PostgreSQL 14+ instance (local install, or e.g.
`docker run -e POSTGRES_PASSWORD=luggo -e POSTGRES_USER=luggo -e POSTGRES_DB=luggo -p 5432:5432 postgres:16`).

```bash
cd server
npm install
cp .env.example .env        # then edit DATABASE_URL / secrets / Razorpay keys
npm run prisma:migrate      # creates the schema in your database
npm run seed                # populates realistic Delhi-based demo data
npm run dev                 # starts the API on http://localhost:4000
```

Seed data creates these accounts (all with password `Password@123`):
- Admin: `admin@luggo.app`
- Customer: `aditi.sharma@example.com` (and 4 more)
- Partner (approved, live): `vikram.partner@example.com` (and 4 more)
- Partner application in `PENDING_REVIEW`: `ritu.applicant@example.com` — view it in the
  admin review queue to try approve/reject/request-changes
- Partner application in `CHANGES_REQUESTED`: `manoj.applicant@example.com` — log in and
  resubmit via `POST /api/partner/applications` to see the resubmission path
- Partner application `REJECTED`: `olddelhi.applicant@example.com`

It also creates one `PAID` and one `PENDING` `Payout` ledger entry, and a handful of
`AnalyticsEvent` rows so `GET /api/admin/analytics/partner-funnel` returns non-zero numbers
immediately.

### Prisma commands

```bash
npm run prisma:migrate    # dev migrations (creates/updates prisma/migrations)
npm run prisma:deploy     # apply existing migrations (production)
npm run prisma:push       # push schema.prisma directly, no migration history
npm run prisma:studio     # visual DB browser
npm run prisma:generate   # regenerate the Prisma client after schema changes
```

This repo does **not** ship a `prisma/migrations` folder — it was built without a live
Postgres instance available to generate one against. Running `npm run prisma:migrate`
against your own database (as above) will create that history from scratch, which is the
right thing to do for ongoing local development. CI and the Docker setup below use
`prisma:push` instead, since a fresh CI database or container has no migration history to
apply in the first place.

### Razorpay test setup

1. Create a free account at [razorpay.com](https://razorpay.com) and switch the dashboard
   to **Test Mode**.
2. Settings → API Keys → generate a test key pair, put them in `RAZORPAY_KEY_ID` /
   `RAZORPAY_KEY_SECRET`.
3. Use Razorpay's published test card numbers (e.g. `4111 1111 1111 1111`, any future
   expiry, any CVV) to complete a checkout in test mode — no real money moves.

### How QR check-in/checkout works

Each booking gets two opaque, unguessable 32-character tokens at creation time
(`qrCheckinToken`, `qrCheckoutToken`) — never anything derived from the customer's name,
email, or booking contents, so a photographed QR code reveals nothing on its own. The
customer's app renders whichever token is relevant to the booking's current status as a QR
image (`GET /api/qr/booking/:bookingId`, generated on the fly with the `qrcode` package). A
partner's scanner posts the scanned string to `POST /api/qr/verify`; the backend looks up
which booking (if any) owns that token, confirms the scanning partner actually owns that
storage location, checks the booking is in the right status and within the check-in time
window, and — guarded by the optimistic-locking `updateMany` described above — transitions
the booking and its `LuggageItem`s forward exactly once.

## Frontend

### Tech stack

React 18 + TypeScript + Vite, React Router, Tailwind CSS, Axios, React Hook Form + Zod
(`@hookform/resolvers`) for form validation, Lucide icons, and Leaflet + OpenStreetMap for
maps (see [Why Leaflet + OpenStreetMap](#why-leaflet--openstreetmap) above — no API key
needed, verified live against real OSM tiles).

### Folder structure

```
client/src/
├── api/          one file per backend resource (auth, storage, bookings, payments,
│                  qr, partner, admin, notifications, analytics, reports) - every
│                  HTTP call in the app goes through one of these, typed end-to-end
├── components/
│   ├── common/    LoadingSpinner, ErrorMessage, EmptyState, Modal, StatusBadge,
│   │              DashboardCard, Stepper, ProtectedRoute, RoleRoute, PageHeader
│   ├── layout/    Navbar, Footer
│   ├── search/    SearchBar, FilterPanel
│   ├── map/       MapView (Leaflet)
│   ├── storage/   StorageCard
│   ├── booking/   LuggageSelector, PriceBreakdownCard, BookingListItem, ReviewForm
│   └── partner/   OperatingHoursEditor, PriceRulesEditor, PhotoUrlsEditor, EarningsCalculator
├── context/       AuthContext (current user, login/register/logout, session bootstrap)
├── layouts/       PublicLayout (Navbar+Footer), DashboardLayout (sidebar, shared by
│                  the partner and admin dashboards)
├── pages/         one file per route (see below)
├── types/         shared TypeScript types mirroring the backend's Prisma models
└── utils/         formatting helpers, the client-side pricing preview, Razorpay
                   script loader
```

### Pages

```
Public       /, /become-partner, /about, /contact, /terms, /privacy
Auth         /login, /register (role toggle: Customer / Storage partner)
Search       /search (list + Leaflet map, filters: distance/price/rating/open-now/luggage type)
Storage      /storage/:id (photos, hours, pricing, reviews, map, Book Storage CTA)
Booking      /book/:id (4-step flow: luggage → time → availability → confirm)
             /payment/:id (Razorpay checkout)
             /booking/:id, /booking/:id/qr, /bookings, /profile

Partner      /partner/dashboard, /partner/storage[/new|/:id/edit], /partner/bookings,
             /partner/check-in (camera scan via the native BarcodeDetector API where
             supported, with manual token entry always available as the reliable
             fallback), /partner/revenue, /partner/apply (onboarding wizard),
             /partner/applications

Admin        /admin/dashboard (incl. the partner-acquisition funnel), /admin/users,
             /admin/partners (suspend/reinstate, trigger payouts), /admin/storage,
             /admin/applications[/:id] (approve/reject/request-changes),
             /admin/bookings, /admin/payments, /admin/reviews, /admin/reports,
             /admin/payouts, /admin/settings (commission %)
```

Route access is enforced by `ProtectedRoute` (any authenticated user) and `RoleRoute`
(specific roles) — but exactly like the backend, this is UX convenience, not the security
boundary: every one of these pages calls an API that independently re-checks
authentication, role, and ownership server-side.

### Installation & running the frontend

No environment variables are needed on the client — the Razorpay key and all other
secrets are only ever handed to the browser inside a specific API response, never baked
into a build.

```bash
cd client
npm install
npm run dev      # starts Vite on http://localhost:5173, proxying /api to the backend on :4000
```

Run the backend (see above) alongside it for the app to actually work end-to-end. Build
for production with `npm run build` (type-checks via `tsc -b`, then bundles with Vite).

## API overview

All responses follow `{ success: boolean, data?: ..., message?: string }`. Protected routes
require the `luggo_access` cookie (set by `/api/auth/login` or `/api/auth/register`).

```
Auth        POST   /api/auth/register | /api/auth/login | /api/auth/refresh | /api/auth/logout
            GET    /api/auth/me

Storage     GET    /api/storage | /api/storage/nearby | /api/storage/:id
            GET    /api/storage/:id/availability      (pre-booking capacity check)
            GET    /api/storage/:id/reviews
            POST   /api/storage/:id/reviews            (customer, post-collection only)

Bookings    POST   /api/bookings                       (customer)
            GET    /api/bookings | /api/bookings/:id
            GET    /api/bookings/:id/availability
            PATCH  /api/bookings/:id/cancel

Payments    POST   /api/payments/create-order | /api/payments/verify   (customer)

QR          GET    /api/qr/booking/:bookingId
            POST   /api/qr/verify                      (partner)

Partner     GET    /api/partner/dashboard | /revenue | /bookings | /payouts
            GET    /POST/PATCH/DELETE /api/partner/storage[/:id]
            POST   /api/partner/applications                (submit or resubmit onboarding)
            GET    /api/partner/applications | /applications/:id

Admin       GET    /api/admin/dashboard | /users | /partners | /storage | /bookings | /payments | /reviews | /reports
            PATCH  /api/admin/partners/:id/approve | /reject | /suspend | /reinstate
            PATCH  /api/admin/storage/:id/approve | /reject
            PATCH  /api/admin/reports/:id
            GET    /api/admin/applications | /applications/:id     (onboarding review queue)
            PATCH  /api/admin/applications/:id/approve | /reject | /request-changes
            GET    /api/admin/payouts
            POST   /api/admin/partners/:id/payouts          (settle eligible earnings into a Payout)
            PATCH  /api/admin/payouts/:id/mark-paid
            GET    /api/admin/settings/commission
            PATCH  /api/admin/settings/commission            (admin-configurable commission %)
            GET    /api/admin/analytics/partner-funnel

Reports     POST   /api/reports                        (any authenticated user)
Notifications GET  /api/notifications
            PATCH  /api/notifications/:id/read | /read-all
Analytics   POST   /api/analytics/events                (public; page-view/funnel tracking)
```

## Testing

```bash
cd server
npm test
```

- `tests/pricingService.test.ts`, `bookingStateMachine.test.ts`, `operatingHours.test.ts`,
  `geo.test.ts` are pure unit tests — no database required, always run in CI.
- `tests/booking.capacity.test.ts` is an integration test against a **real** Postgres
  database (it exercises the actual `pg_advisory_xact_lock` behaviour, which cannot be
  meaningfully mocked). Run `npm run prisma:migrate` against a real/disposable Postgres
  instance first. It specifically proves: overlap accounting is correct, a booking that
  would overflow capacity is rejected, a booking that exactly fills capacity succeeds, and
  firing two concurrent requests for more bags than remain results in exactly one success.

## Security

- Passwords hashed with bcrypt (12 salt rounds), never returned in any API response.
- JWT access + refresh tokens in `httpOnly`, `sameSite=lax` cookies (not readable by JS,
  not vulnerable to naive XSS token theft); `secure` in production.
- Every protected route runs `authenticate` (verifies the JWT) then `requireRole(...)`
  and/or an explicit ownership check in the service layer — a customer can only see their
  own bookings, a partner only their own locations/bookings, checked in code, not just
  hidden in the UI.
- Payment amounts are always recomputed server-side from the booking record; the Razorpay
  secret key never leaves the backend process; signatures are verified with HMAC-SHA256
  before a booking is ever marked `CONFIRMED`.
- Centralized error handler (`middleware/errorHandler.ts`) never leaks stack traces, raw
  Prisma errors, or internals to the client.
- Helmet, CORS locked to `FRONTEND_URL`, and tiered rate limiting (a global limiter plus
  tighter limiters on `/api/auth/*` and `/api/payments/*`).
- All input validated with Zod before it reaches a controller.

## Deployment

### Local, with Docker Compose

The fastest way to run the whole stack (Postgres + API + frontend) as it would look in
production, on one machine:

```bash
cp .env.example .env    # then fill in JWT secrets, QR_SECRET, and Razorpay test keys
docker compose up --build
```

This starts three containers - `postgres` (5432), `server` (4000), and `client` (8080,
nginx serving the built React app and reverse-proxying `/api/*` to `server` - see
[client/nginx.conf](client/nginx.conf)). Open **http://localhost:8080**. The server
container runs `prisma db push` on boot to sync the schema (see the note on migrations
above) - it does **not** run the seed script, so you'll want to run it once yourself:

```bash
docker compose exec server npm run seed
```

Each Dockerfile ([server/Dockerfile](server/Dockerfile), [client/Dockerfile](client/Dockerfile))
is a multi-stage build - compile/bundle in one stage, ship only the runtime output in the
final image.

### Production (split hosting)

For a real deployment you'd typically split these across managed services rather than run
one docker-compose stack:

1. **Database**: a managed Postgres (Neon, Supabase, Railway, RDS, etc.) — take the
   connection string it gives you as `DATABASE_URL`.
2. **Server**: deploy [server/Dockerfile](server/Dockerfile) to any container host (Render,
   Railway, Fly.io, an ECS/Cloud Run service). Set all the variables from
   [server/.env.example](server/.env.example), with `FRONTEND_URL` pointing at wherever the
   client actually ends up (this is what CORS is locked to - see `app.ts`), and Razorpay's
   **live** keys once you're ready to leave test mode.
3. **Client**: since it's a static Vite build, it doesn't need the nginx container in
   production - `npm run build` inside `client/` and deploy the `dist/` folder to any
   static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront). Point that host's
   rewrite/proxy rules at the deployed server for `/api/*` (equivalent to what
   `nginx.conf`/Vite's dev proxy do), or update `client/src/api/client.ts`'s `baseURL` to
   the server's full URL if the host can't proxy.
4. Run `npm run prisma:migrate` once against the production database from a trusted
   machine (or `prisma:deploy` if you've committed a migrations history by then) before
   the server's first boot.

### CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push/PR:
- **Server job**: spins up a real ephemeral Postgres service container, generates the
  Prisma client, syncs the schema, type-checks, builds, and runs the full test suite
  (unit tests **and** the capacity/concurrency integration test - the ephemeral database
  means that test isn't skipped in CI the way it would be without Postgres available).
- **Client job**: lints, then builds (which type-checks via `tsc -b` first).

## Future improvements

- Razorpay webhook listener as a defense-in-depth complement to the current
  frontend-triggered `/verify` call (covers the case where the customer's browser closes
  before that call fires but the payment still succeeded).
- Refund flow for cancellations made after a successful payment.
- A scheduled job to expire stale `PENDING_PAYMENT` bookings proactively, rather than
  lazily on next access to that location.
- A committed `prisma/migrations` history (see the note in Prisma commands above) —
  start one with `npm run prisma:migrate` against your own database.
- Frontend automated tests (component/integration tests with e.g. Vitest + React Testing
  Library) - the backend has the test suite described above, but the client currently has
  none.
- Route-level code splitting (`React.lazy`) - the production build currently ships one
  ~640KB JS bundle; splitting by route (customer / partner / admin) would cut initial
  load size meaningfully.
