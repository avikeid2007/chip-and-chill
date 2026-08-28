# Tournament & League Engine + Driving Range Bay Mode (Phase 4)

Comprehensive guide to the Tournament Management Engine and Driving Range Bay Booking system implemented in Phase 4.

---

## 🏆 1. Tournament & League Engine

### Overview
Courses can schedule open championships, member-guest Invitationals, and weekly scrambles. Golfers can view upcoming events, register online with entry fee payments, view their assigned pairing groups, and watch the real-time leaderboard as scores are entered.

### Key Capabilities
* **Multiple Tournament Formats**:
  * **Stroke Play**: Lowest cumulative gross score and to-par wins.
  * **Stableford**: Points awarded per hole relative to par (Eagle: 4, Birdie: 3, Par: 2, Bogey: 1, Double+: 0).
  * **Team Scramble**: Best-ball team scoring.
  * **Match Play**: Head-to-head match hole scoring.
* **Golfer Registration & Entry Fees**:
  * Self-registration flow with Handicap Index tracking.
  * Integrated with the platform's multi-currency payment checkout (`₹ / ₨` INR default, USD, EUR, etc.).
* **1-Click Auto-Pairings Generator**:
  * Sorts the active roster by handicap and assigns golfers into balanced groups (Twosomes, Threesomes, or Foursomes).
  * Automatically spaces group tee times by a configurable interval (e.g., 8-minute intervals).
* **Live Interactive Leaderboard**:
  * Dynamic ranking with Gold 🥇, Silver 🥈, and Bronze 🥉 indicators.
  * To-Par badges (`-3` in green, `E` in neutral, `+4` in red).
  * Hole breakdown showing Eagle 🦅, Birdie 🟢, Par, and Bogey counters.
* **Live Hole-by-Hole Score Logger**:
  * Accessible by golfers or scorekeepers during the round. Updates the live leaderboard instantly.

### API Endpoints
* `GET /api/tenants/{tenantId}/tournaments` — List public tournaments
* `GET /api/tenants/{tenantId}/tournaments/{id}` — Tournament detail + leaderboard + pairings
* `POST /api/tenants/{tenantId}/tournaments` — Create tournament (Admin)
* `PUT /api/tenants/{tenantId}/tournaments/{id}` — Update tournament/status (Admin)
* `DELETE /api/tenants/{tenantId}/tournaments/{id}` — Delete tournament (Admin)
* `POST /api/tenants/{tenantId}/tournaments/{id}/register` — Register golfer
* `POST /api/tenants/{tenantId}/tournaments/{id}/registrations/{regId}/confirm-sandbox-payment` — Confirm entry fee payment
* `POST /api/tenants/{tenantId}/tournaments/{id}/generate-pairings` — Auto-generate groups & tee times
* `POST /api/tenants/{tenantId}/tournaments/{id}/scores` — Record hole score
* `GET /api/tenants/{tenantId}/tournaments/{id}/leaderboard` — Get calculated leaderboard

---

## 🎯 2. Driving Range & Bay Booking Mode

### Overview
Enables golf ranges, Toptracer/TrackMan entertainment facilities, and practice centers to operate bay reservation systems alongside or instead of traditional 18-hole tee sheets.

### Key Capabilities
* **Bay Setup & Equipment Tags**:
  * Configure bay number, name, indoor/covered vs outdoor grass stall, and launch monitor availability (TrackMan, FlightScope).
  * Set hourly rates in the course currency (e.g. `₹300` / hr).
* **Duration-Based Booking Grid**:
  * Golfers can select session lengths (30, 60, 90, 120 minutes) and view real-time availability slots.
  * Automatic price calculation based on duration.
* **Live Bay Status Board (`/dashboard/range`)**:
  * Real-time monitoring card for every bay showing status: `Available`, `Occupied`, or `Maintenance`.
  * Active session countdown timer (`⏱️ 24m left`) with progress bar and alert ring when `< 5m` remain.
* **Walk-In Check-In**:
  * 1-click modal for pro shop staff to immediately allocate an open bay to a walk-in golfer and start the session timer.
* **Today's Reservations Ledger**:
  * Chronological log of all daily bay bookings, duration, rate, and check-in statuses.

### API Endpoints
* `GET /api/tenants/{tenantId}/range/bays` — List all configured bays
* `POST /api/tenants/{tenantId}/range/bays` — Add a new bay (Admin)
* `PUT /api/tenants/{tenantId}/range/bays/{id}` — Edit bay configuration (Admin)
* `DELETE /api/tenants/{tenantId}/range/bays/{id}` — Remove a bay (Admin)
* `GET /api/tenants/{tenantId}/range/availability` — Check available slots by date & duration
* `POST /api/tenants/{tenantId}/range/bookings` — Book a bay session
* `POST /api/tenants/{tenantId}/range/bookings/{id}/confirm-sandbox-payment` — Confirm payment
* `POST /api/tenants/{tenantId}/range/bookings/{id}/check-in` — Check in and activate session
* `POST /api/tenants/{tenantId}/range/bookings/{id}/cancel` — Cancel bay booking + auto-refund
* `GET /api/tenants/{tenantId}/range/live-status` — Get real-time bay status and countdown timers
