# Chip & Chill — Documentation

Welcome to the **Chip & Chill** platform documentation (formerly OpenGolf). ChipandChill.com — golf course & range booking, scorecards, and stats.

This folder tracks everything that's been built and how to test it.

## 📁 Contents

| Document | Purpose |
|---|---|
| [Setup Guide](./setup.md) | Run the API + client locally, database config |
| [Testing Guide](./testing-guide.md) | Step-by-step manual test scripts for every feature |
| [API Reference](./api-reference.md) | All REST endpoints with request/response examples |
| [Features](./features/) | Per-feature implementation details |

## 🚀 Quick Start

```powershell
# Terminal 1 — API (port 5000)
cd server/OpenGolf.Api
dotnet run --urls "http://localhost:5000"

# Terminal 2 — Client (port 5173)
cd client
npm install   # first time only
npm run dev
```

Open **http://localhost:5173**

## ✅ Implementation Status

### Phase 1 — MVP (COMPLETE)
- Auth: register, login, forgot/reset password, profile settings
- Multi-tenant architecture (TenantId scoping via EF query filters)
- Tee time booking: availability calendar, book, cancel
- Course info: public profile page, admin editor (holes, par, yardage)
- Admin dashboard: stats summary, tee sheet manager (block/unblock), bookings management (check-in), staff accounts (invite/remove)
- Course onboarding wizard (`/create-course`) with logo upload

### Phase 2 — Scorecards & Stats (COMPLETE)
- Digital scorecard entry with live totals
- Round history & detail views
- WHS handicap calculation (differential per round + handicap index)
- Stats dashboard: score trend chart, hole performance chart, birdie/pars/bogeys table
- Booking confirmation emails (pluggable provider: Console / SMTP / SendGrid-stub)
- Waitlists: join full slots, auto-email notification on cancellation

### Phase 3+ — Not started
Payments (Stripe Connect), pricing rules engine, branding/domains, Super Admin tools, tournaments, range mode, plugin API.

## 🔑 Test Accounts

| Account | Password | Role | Notes |
|---|---|---|---|
| `smoketest@example.com` | `NewPass123!` | Golfer | Has 7 seeded rounds + bookings at Pine Hollow |
| `admin@pinehollow.test` | `AdminPass123!` | CourseAdmin | Owns Pine Hollow Golf Club (18 slots today) |
| `cedar@ridgetest.com` | `CedarPass123!` | CourseAdmin | Owns Cedar Ridge Golf Club (18 holes) |

## 🗄️ Database

MySQL at `140.238.253.216`, database `openGolfDev`. Connection string lives in `server/OpenGolf.Api/appsettings.json`.

⚠️ **Credentials are in plaintext in appsettings.json — move to environment variables or user-secrets before any public commit.**
