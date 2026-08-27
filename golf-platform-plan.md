# Open Golf — Open Source Golf Course & Range Platform

A multi-tenant web platform where any golf course or driving range can sign up, manage their own tee sheet/bay schedule, and let golfers book, track scores, and view course info — all self-hostable or run as a shared instance.

## 1. Core Concept

Think "WordPress for golf courses": one open-source codebase, many independent tenants (courses/ranges), each with their own branding, staff, pricing, and golfers, but sharing the same underlying platform and improvements.

## 2. User Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Super Admin** | Platform-wide | Manage tenants, global settings, moderation |
| **Course Admin** | One tenant | Manage tee sheet, pricing, staff, course content, reports |
| **Staff** | One tenant | Front-desk booking overrides, check-ins, limited edits |
| **Golfer** | Cross-tenant | Book tee times/bays at any tenant, log scores, track stats, manage profile |

A single golfer account can book across many different courses — this is the key reason to go multi-tenant rather than "install one instance per course."

## 3. Core Modules

1. **Tenant management** — course/range onboarding, branding (logo, colors), subdomain or custom domain support
2. **Tee time / bay booking** — real-time availability calendar, booking rules (advance windows, group size), cancellations, waitlists, optional payments
3. **Scorecards & stats** — digital scorecard entry per round, handicap calculation (USGA/WHS formula), round history, trends over time
4. **Course info** — hole-by-hole yardages/par, course map, weather widget, pro shop info, events/leagues
5. **Admin dashboard** — tee sheet management, pricing rules (peak/off-peak, member rates), staff accounts, booking reports, revenue summaries
6. **Driving range mode** — simpler bay-based booking (no 18-hole scorecard needed), bucket/session pricing

## 4. Tech Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, a rich/distinctive visual design (not a generic template look) — data views like scorecards and tee sheets get a custom, purpose-built treatment
- **Backend**: ASP.NET Core Web API (C#), EF Core as the ORM
- **Database**: SQL Server or MySQL — EF Core provider selected via config, so self-hosters can pick either (SQL Server via `Microsoft.EntityFrameworkCore.SqlServer`, MySQL via `Pomelo.EntityFrameworkCore.MySql`); multi-tenant via a `TenantId` column on shared tables
- **Auth**: ASP.NET Core Identity + JWT bearer tokens, role-based access control (RBAC) for Super Admin / Course Admin / Staff / Golfer; OAuth (Google/Apple) as optional login
- **Payments**: Stripe Connect (lets each tenant receive their own payouts)
- **Hosting**: Docker Compose for self-hosting (API container + DB container + frontend static build); deployable to any VPS or cloud
- **Notifications**: Email (booking confirmations) via a pluggable provider (SMTP/SendGrid); SMS optional

## 5. Data Model (high level, maps to EF Core entities)

```
Tenant (Id, Name, Type[Course|Range], Domain, Branding, Timezone)
User (Id, Email, Role, TenantId[nullable for golfers])
CourseProfile (TenantId, Holes[], Yardages, Par, MapUrl)
TeeSheet (TenantId, Date, Slots[])
Booking (Id, TenantId, UserId, SlotId, PartySize, Status)
Round (Id, UserId, TenantId, Date, Scores[], HandicapDiff)
PricingRule (TenantId, DayType, TimeRange, Price)
```

Each becomes an EF Core entity class + `DbSet<T>` on an `AppDbContext`, with Fluent API configuration for the `TenantId` global query filter (so every query is automatically scoped to the current tenant).

## 6. Project Structure

```
opengolf/
├── client/                  # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── pages/           # Landing, CourseBrowse, Booking, Dashboard, Admin
│   │   ├── components/      # Tee sheet, scorecard, booking calendar, etc.
│   │   ├── api/             # Typed fetch client for the ASP.NET Core API
│   │   └── styles/          # Tailwind + design tokens
│   └── vite.config.ts
├── server/                  # ASP.NET Core Web API
│   ├── OpenGolf.Api/
│   │   ├── Controllers/     # TenantsController, BookingsController, etc.
│   │   ├── Models/          # EF Core entity classes
│   │   ├── Data/            # AppDbContext, migrations
│   │   ├── Program.cs       # DI, auth, DB provider selection
│   │   └── appsettings.json # Connection string, JWT settings
│   └── OpenGolf.sln
└── docker-compose.yml        # API + DB + frontend containers
```

## 7. Multi-Tenancy Approach

- **Shared DB, `tenant_id` column** on every tenant-scoped table — simplest for an open-source project since self-hosters won't need to manage many databases
- Tenants get either a subdomain (`pinehill.opengolf.app`) or connect a custom domain
- Platform-wide super admin can see all tenants (for hosted/SaaS version); self-hosters typically run one tenant but the multi-tenant code path stays intact

## 8. Open Source Considerations

- **License**: MIT or AGPL (AGPL prevents a company from hosting your code as a paid SaaS without contributing back — worth deciding early)
- **Governance**: clear `CONTRIBUTING.md`, issue templates, a roadmap board (GitHub Projects)
- **Plugin/extension points**: e.g. custom pricing rules, alternate handicap formulas, integrations (POS systems, existing booking tools) — design these as interfaces early so the community can extend without forking
- **Self-hosting docs**: Docker Compose file + `.env.example` + a "deploy in 10 minutes" guide lowers the bar for course owners to try it

## 9. Suggested Roadmap

**Phase 1 — MVP (single tenant, core booking)**
- Tenant + auth system
- Tee sheet + booking flow
- Basic course info pages
- Admin dashboard (view/manage bookings)

**Phase 2 — Scorecards & stats**
- Digital scorecard entry
- Handicap calculation
- Round history/stats dashboard

**Phase 3 — Multi-tenant polish**
- Tenant onboarding flow
- Custom branding/domains
- Payments (Stripe Connect)
- Pricing rules engine
- Tournament registration payments (ties into Stripe Connect above)

**Phase 4 — Tournaments, range mode & community**
- Tournament & league module (registration, pairings, live leaderboards)
- Driving range/bay booking variant
- Plugin/extension API
- Public tenant directory ("find a course near me")

## 10. Detailed Module → Page → Feature Breakdown

Full scope across all phases. ✅ = MVP (Phase 1). Everything else is Phase 2–4 per the roadmap.

### Module A: Auth & Accounts
| Page | Functions |
|---|---|
| Sign up ✅ | Golfer self-registration; Course Admin registration (creates a Tenant); email verification |
| Log in ✅ | Email/password login; JWT issuance; "remember me" |
| Forgot / reset password ✅ | Reset email, token-based reset form |
| OAuth login | Google/Apple sign-in |
| Profile settings ✅ | Edit name, contact info, avatar, password change |
| Role & permissions (internal) ✅ | RBAC enforcement: Super Admin, Course Admin, Staff, Golfer |

### Module B: Tenant (Course/Range) Management
| Page | Functions |
|---|---|
| Tenant onboarding wizard ✅ | Create tenant, choose type (course/range), set timezone, initial branding |
| Branding settings | Logo upload, color theme, subdomain or custom domain config |
| Tenant directory (public) | Searchable/filterable list of all courses & ranges on the platform ("find a course near me") |
| Super Admin: tenant list | View/suspend/approve tenants (SaaS mode) |
| Super Admin: platform settings | Global feature flags, moderation |

### Module C: Course Info
| Page | Functions |
|---|---|
| Course profile page ✅ | Name, description, address, contact, photos |
| Hole-by-hole details ✅ | Par, yardage (multiple tee boxes), hole notes, hole map image |
| Course map / layout | Interactive or static full-course map |
| Weather widget | Current conditions + forecast for course location |
| Events / leagues page | Link to full tournament listing (see Module G) |
| Pro shop info | Hours, contact, featured items (static content, no e-commerce in MVP) |
| Course info editor (admin) ✅ | CRUD for all of the above, from the admin dashboard |

### Module D: Tee Time / Bay Booking
| Page | Functions |
|---|---|
| Availability calendar ✅ | View open slots by date, filter by time/players; range mode shows bays instead of tee times |
| Book a slot ✅ | Select slot, party size, confirm; creates Booking record |
| My bookings ✅ | Upcoming/past bookings, cancel a booking |
| Booking confirmation | Email confirmation (pluggable SMTP/SendGrid) |
| Waitlist | Join waitlist when full; auto-notify on cancellation |
| Admin: tee sheet manager ✅ | View full day's schedule, manually add/edit/block slots, override bookings |
| Admin: booking rules | Set advance-booking window, max party size, blackout dates |
| Pricing rules engine | Peak/off-peak pricing, member vs. public rate, day-type pricing |
| Payment at booking | Stripe Connect checkout, tenant payout routing |

### Module E: Scorecards & Stats
| Page | Functions |
|---|---|
| Digital scorecard entry ✅ | Enter strokes per hole for a round, select tee box, auto-total |
| Round history ✅ | List of past rounds with scores, course, date |
| Round detail view ✅ | Full hole-by-hole breakdown of one round |
| Stats dashboard | Trends over time (avg score, fairways/greens hit if tracked, best/worst holes) |
| Handicap tracking | USGA/WHS handicap calculation from round history, handicap index display |

### Module F: Admin Dashboard (Course Admin / Staff)
| Page | Functions |
|---|---|
| Dashboard home ✅ | Today's bookings at a glance, quick stats (bookings this week, occupancy) |
| Bookings management ✅ | Search/filter all bookings, manual check-in, cancel/refund |
| Staff accounts ✅ | Invite staff, assign permissions |
| Reports | Revenue summary, utilization/occupancy reports, exportable |
| Course content editor ✅ | Shared with Module C's editor — one place to manage course info |

### Module G: Tournaments & Leagues
| Page | Functions |
|---|---|
| Tournament list (public) | Browse upcoming/past tournaments across a tenant (or platform-wide), filter by date/type |
| Tournament detail page | Format (stroke play, match play, scramble, etc.), date, entry fee, field size, rules/notes |
| Create tournament (admin) | Set format, date, course, tee times/pairings, entry fee, max field size, registration window |
| Registration / sign-up | Golfer registers, pays entry fee (ties into Payment module once live), waitlist if full |
| Pairings & tee times | Auto- or manual-assign groups to starting times; publish pairing sheet |
| Live leaderboard | Real-time standings as scores are entered; supports gross/net, flights/divisions |
| Score entry (tournament round) | Player or scorekeeper enters scores per hole; separate from casual round entry in Module E |
| Results & payouts page | Final standings, skins/closest-to-pin winners, prize breakdown |
| League/season view | Recurring series across multiple events, cumulative season standings |

This absorbs the earlier "Events/leagues" stub in Module C and the "Leaderboards" line in Module E — tournaments get real registration, pairings, and live scoring rather than just a static listing.

### Module H: Driving Range Mode (Phase 4)
| Page | Functions |
|---|---|
| Bay availability | Simplified slot grid (bays instead of tee times) |
| Bucket/session booking | Book a bay + bucket size, no 18-hole scorecard needed |
| Range admin dashboard | Same booking-management pattern as Module F, scoped to bays |

### Module I: Platform Extensibility (Phase 4)
| Page | Functions |
|---|---|
| Plugin/extension settings (admin) | Enable/configure community plugins (alt handicap formulas, POS integrations, custom pricing rules) |
| Developer docs (static site) | Plugin API reference for contributors |

---

**MVP page count**: ~18 pages across Modules A–D–E–F (marked ✅) — this is the realistic Phase 1 build list. Tournaments (Module G) is Phase 2+, since it depends on booking and scoring foundations being solid first.
**Full platform**: ~44+ pages once every module and phase is complete (9 modules total).

## 11. Decisions Locked In

- **License**: MIT
- **Hosting model**: Designed for hosted SaaS *and* self-hosting from day one — multi-tenancy (Tenant table, `TenantId` scoping) is core architecture, not bolted on later. Self-hosters typically run one tenant; the SaaS version just adds a Super Admin tenant-management layer on top.
- **Payments**: Deferred to Phase 3. MVP bookings have no payment step (pay-at-course), so Stripe Connect complexity doesn't block early development.
- **Platform**: Web-only (responsive), no native mobile app for now.
- **Default DB**: SQL Server as the primary example in docs/Docker Compose (best EF Core tooling support); MySQL fully supported as an alternate provider via Pomelo.

## 12. Revised MVP Scope (Phase 1)

Given the "all features, both user types" scope, Phase 1 is trimmed to the smallest slice that's still a usable product for one tenant, with multi-tenant architecture underneath:

- Tenant + auth (Course Admin, Staff, Golfer roles) — no Super Admin UI yet, but data model supports it
- Tee time booking (calendar, availability, cancellation) — no payments, no waitlist yet
- Basic course info page (holes, yardages, map)
- Digital scorecard entry + round history (handicap calc can follow in Phase 2)
- Admin dashboard: view/manage bookings, edit course info

Explicitly out of MVP: payments, waitlists, pricing rules engine, range/bay mode, Super Admin tenant directory, plugin API — all still on the roadmap in Phases 2–4.

## 13. MVP Build Checklist

Tracks implementation status of every MVP page. Frontend pages are built with mock/demo data and matching design system; wiring to live API endpoints happens as each page is connected during backend integration testing.

| Module | Page | Frontend UI | Wired to API | Notes |
|---|---|---|---|---|
| Auth | Sign up | ✅ Built | ✅ `authApi.register` | `/register` |
| Auth | Log in | ✅ Built | ✅ `authApi.login` | `/login` |
| Auth | Forgot/reset password | ✅ Built | ⬜ Not wired | `/forgot-password` — needs `POST /api/auth/forgot-password` on backend (not yet built) |
| Auth | Profile settings | ✅ Built | ⬜ Not wired | `/profile` — needs `PUT /api/users/me` on backend (not yet built) |
| Course Info | Course profile (public) | ✅ Built | ⬜ Mock data | `/courses/:id` — needs wiring to `courseApi.getTenant` + `getHoles` |
| Course Info | Course info editor (admin) | ✅ Built | ⬜ Mock data | `/dashboard/course` — needs wiring to `courseApi.saveHoles` + `updateTenant` |
| Booking | Availability calendar / book a slot | ✅ Built | ⬜ Mock data | `/booking` — needs wiring to live `GET /api/tenants/{id}/tee-slots` + `POST .../bookings` |
| Booking | My bookings | ✅ Built | ⬜ Mock data | `/bookings` — needs wiring to `bookingsApi.mine` + `cancel` |
| Booking | Admin: tee sheet manager | ✅ Built | ⬜ Mock data | `/dashboard/tee-sheet` — needs `POST .../tee-slots` + a block/unblock endpoint (not yet built) |
| Scorecards | Digital scorecard entry | ✅ Built | ⬜ Mock data | `/rounds/new` — needs wiring to `roundsApi.create` |
| Scorecards | Round history | ✅ Built | ⬜ Mock data | `/rounds` — needs wiring to `roundsApi.mine` |
| Scorecards | Round detail view | ✅ Built | ⬜ Mock data | `/rounds/:id` — needs wiring to `roundsApi.getById` |
| Admin Dashboard | Dashboard home | ✅ Built | ⬜ Mock data | `/dashboard` — needs a stats/summary endpoint (not yet built) |
| Admin Dashboard | Bookings management | ✅ Built | ⬜ Mock data | `/dashboard/bookings` — needs a tenant-wide bookings list endpoint (currently only "mine" exists) |
| Admin Dashboard | Staff accounts | ✅ Built | ⬜ Mock data | `/dashboard/staff` — needs staff invite/list/remove endpoints (not yet built) |

**Frontend**: 15/15 MVP pages built and verified compiling (`npm run build` passes clean).
**Backend wiring**: 2/15 connected to live endpoints (auth only). The rest render correctly against mock data but need their corresponding API calls wired in — most of the *read* endpoints already exist (Tenants, CourseHoles, TeeSlots, Bookings, Rounds controllers), but several *write/admin* endpoints identified below don't exist yet.

## 14. New Requirements & Gaps Found While Building

Building out the full MVP page set surfaced backend gaps not previously scoped. Adding these to the roadmap:

- **`GET /api/users/me` + `PUT /api/users/me`** — Profile settings page needs to read/update the current user; no such endpoint exists yet (only registration/login).
- **`POST /api/auth/forgot-password` + `POST /api/auth/reset-password`** — password reset flow has no backend support yet; needs an email token flow.
- **Tenant-wide bookings list for admins** — `BookingsController` currently only exposes "my bookings" (scoped to the calling golfer). Admins need `GET /api/tenants/{id}/bookings` to see *everyone's* bookings for the tee sheet and bookings-management pages.
- **Block/unblock a tee slot** — `TeeSlot.IsBlocked` exists on the model, but there's no endpoint to toggle it; the tee sheet manager page needs `PATCH /api/tenants/{id}/tee-slots/{slotId}`.
- **Check-in status transition** — `BookingStatus` supports `CheckedIn`, but there's no endpoint to set it; bookings management needs `POST /api/tenants/{id}/bookings/{bookingId}/check-in`.
- **Staff invite/list/remove** — no `StaffController` exists yet. Needs invite-by-email (creates a pending `ApplicationUser` scoped to the tenant with `Staff` role), list, and remove endpoints.
- **Dashboard summary stats** — the admin dashboard home page wants aggregate numbers (bookings today/this week, occupancy %, revenue). Needs a lightweight `GET /api/tenants/{id}/dashboard-summary` endpoint rather than composing it client-side from raw booking data.
- **Admin layout as a first-class pattern** — added `AdminLayout.tsx` (sidebar nav: Overview, Tee Sheet, Bookings, Course Info, Staff) to group all Course Admin/Staff pages consistently, rather than each admin page reimplementing navigation.

These are Phase 1 additions (they complete the MVP as scoped), not new phases — the roadmap in Section 9 doesn't need to change, but the backend controller list does grow: add `UsersController` and `StaffController`, and extend `BookingsController` with the endpoints above, plus a new `TeeSlotsController` (or extend `BookingsController` further) for slot blocking.

Given the "all features, both user types" scope, Phase 1 is trimmed to the smallest slice that's still a usable product for one tenant, with multi-tenant architecture underneath:

- Tenant + auth (Course Admin, Staff, Golfer roles) — no Super Admin UI yet, but data model supports it
- Tee time booking (calendar, availability, cancellation) — no payments, no waitlist yet
- Basic course info page (holes, yardages, map)
- Digital scorecard entry + round history (handicap calc can follow in Phase 2)
- Admin dashboard: view/manage bookings, edit course info

Explicitly out of MVP: payments, waitlists, pricing rules engine, range/bay mode, Super Admin tenant directory, plugin API — all still on the roadmap in Phases 2–4.
