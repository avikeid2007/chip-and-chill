# ⛳ Chip & Chill — Modern Golf Operations & Tournament Championship Platform

A modern, full-stack multi-tenant golf course management and championship tournament platform. Features real-time tee time booking, automated pairings, multi-round championship tournament engine (36/54/72 holes), cut line manager, live skins game engine, automated prize purse distributions, broadcast TV kiosk, printable starter collateral, and season-long Order of Merit league standings.

**Repository**: [avikeid2007/chip-and-chill](https://github.com/avikeid2007/chip-and-chill)  
**License**: MIT

---

## ✨ Features Overview

### 🏆 Championship Tournament & League Suite (Phases 1, 2 & 3)

- 🏌️ **Multi-Round Championships (36 / 54 / 72 Holes)**:
  - Multi-round tournament setup (1 to 4 rounds, 9 or 18 holes per round).
  - Active round progression with live cumulative Gross, Net, and per-round score columns (`R1`, `R2`, `R3`, `R4`, `Total`, `To Par`).
  - Multi-round digital scorecard entry supporting Stableford, Stroke Play, and Scramble formats.

- ✂️ **Cut Line Manager**:
  - 1-click tournament cut execution (e.g. Cut to Top 30 after Round 1 or 2).
  - USGA / PGA standard "Include Ties" rule.
  - Automatic `Made Cut` qualification and `MC` (Missed Cut) tagging with leaderboards automatically sorting cut players below active competitors.

- 🖨️ **Printable Tournament Collateral Suite**:
  - **⛳ Official Golf Cart Signs**: High-contrast steering wheel clip cards with Course Logo, Group #, Tee Time, Starting Hole, Player Names, Flights, and Course Handicaps.
  - **📝 USGA 18-Hole Paper Scorecards**: Pre-populated golfer names, handicap allocation stroke dots (●), OUT/IN/TOT/NET columns, and Attest / Marker signature lines.
  - **📋 Starter Box Master Tee Sheet**: Chronological player manifest with check-in signoff checkboxes and repeatable table headers across multi-page prints.
  - **📄 Smart Print Layouts**: Toolbar switcher supporting **2-Up (Half-Sheet with dashed cut guides)** and **1-Up (Full Page)** with scoped `@media print` CSS.

- 🎯 **Live Skins Game Engine**:
  - Real-time hole-by-hole skin calculations for Gross and Net scoring.
  - Automatic **Carryover Accumulation**: Ties carry over to subsequent holes until won outright.

- 💰 **Automated Prize Purse & Payout Distribution**:
  - Configurable tournament prize purse with standard PGA-style payout curves.
  - Automatic tie-splitting algorithms (e.g., T2 splits 2nd and 3rd place purse evenly).
  - Custom purse override tool for instant financial recalculations.

- 📺 **Live Clubhouse TV Broadcast Kiosk (`/tournaments/:id/tv`)**:
  - Fullscreen dark broadcast leaderboard for clubhouse TVs and pro shop displays.
  - Auto-cycling pagination for large fields (8 golfers per slide with indicator dots).
  - Live side contests ticker for **Closest to Pin (CTP)** and **Longest Drive (LD)**.

- ⚡ **Auto-Pairings & Interactive Starting Tee Sheet**:
  - 1-click automatic pairing generator by group size (Twosomes, Threesomes, Foursomes) and interval spacing.
  - Visual tee sheet cards with drag-and-drop manual group reassignment and group tee-time editors.

- 🏷️ **Handicap Auto-Flighting**:
  - Rule-based division engine automatically segmenting golfers into Championship, Flight A, Flight B, Flight C, Senior, or Ladies divisions by Handicap Index.

- ⭐ **Season-Long Order of Merit (FedEx Cup Style Race)**:
  - Automated season points accumulator (1st: 500pts, 2nd: 300pts, 3rd: 190pts, down to participation points).
  - Standings table tracking Total Points, Events Played, Wins, Top-10s, and Season Earnings.

---

### 🏌️ Golfer & Course Operations Core

- 📅 **Tee Time Booking & Waitlist Engine**: Real-time availability, player capacity management, and automated cancellation notifications.
- 🏌️ **WHS-Compliant Handicap System**: Best 8 of last 20 differential handicap calculations.
- 🎯 **Driving Range & Simulator Bay Management**: Hourly bay booking, launch monitor equipment tracking, and active bay timers.
- 👥 **Tenant Member Directory**: Member indexing, handicap tracking, and 1-click tournament enrollment.
- 🏢 **Multi-Tenant Isolation**: High-security tenant scoping using EF Core global query filters and JWT claims.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router v7 |
| **Backend** | ASP.NET Core 10, Entity Framework Core 10, ASP.NET Identity |
| **Database** | MySQL 8 (Production) / Microsoft SQL Server (Development) |
| **Authentication** | JWT Bearer Authentication with Role-Based & Tenant-Scoped Access |
| **API Documentation** | Swagger / OpenAPI (Swashbuckle) |
| **Print & Display** | High-precision Scoped `@media print` CSS Engine & Fullscreen Broadcast APIs |

---

## 🚀 Quick Start

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- MySQL 8+ or SQL Server

### 1. Clone & Setup Configuration
```bash
git clone https://github.com/avikeid2007/chip-and-chill.git
cd chip-and-chill
```

### 2. Backend Setup
```bash
cd server/ChipAndChill.Api

# Restore dependencies
dotnet restore

# Run database migrations (Automatic on startup or via EF CLI)
dotnet ef database update

# Run the API server (Runs on http://localhost:5000)
dotnet run
```
- API Base URL: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`

### 3. Frontend Setup
In a new terminal:
```bash
cd client

# Install packages
npm install

# Start Vite dev server (Runs on http://localhost:5173)
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 📁 Project Architecture

```
chip-and-chill/
├── client/                                  # React 19 + Vite Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── TournamentManager.tsx       # Phase 1/2/3 Championship & Collateral Manager
│   │   │   ├── TournamentDetail.tsx        # Public Player Leaderboard & Scorecard Portal
│   │   │   ├── TournamentTvLeaderboard.tsx # High-contrast Clubhouse TV Broadcast Kiosk
│   │   │   ├── Booking.tsx                 # Tee time reservation & waitlist
│   │   │   ├── RangeBayManager.tsx         # Driving range & simulator bay bookings
│   │   │   ├── StatsDashboard.tsx          # WHS handicap index & round analysis
│   │   │   ├── CourseEditor.tsx            # Hole configuration & course ratings
│   │   │   └── SuperAdminDashboard.tsx     # Platform-wide tenant management
│   │   ├── components/
│   │   │   ├── TournamentPrintCollateralModal.tsx # 2-Up Cart Signs, Scorecards & Starter Sheets
│   │   │   ├── TournamentScorecardModal.tsx       # 18-Hole Multi-Round Digital Matrix
│   │   │   ├── AdminLayout.tsx                    # Course operations sidebar
│   │   │   └── NavBar.tsx                         # Main navigation bar
│   │   ├── api/
│   │   │   ├── tournament.ts                      # Tournament, cut line, pairings & skins API
│   │   │   ├── bookings.ts                        # Tee time & bay booking API
│   │   │   ├── course.ts                          # Course & tenant CRUD
│   │   │   └── client.ts                          # Resilient fetch client with empty body safety
│   │   └── types.ts                               # TypeScript domain definitions
│   └── package.json
│
├── server/ChipAndChill.Api/                 # ASP.NET Core 10 Web API
│   ├── Controllers/
│   │   ├── TournamentsController.cs        # Multi-round scoring, cut line, pairings, skins & merit
│   │   ├── RangeBaysController.cs          # Driving range bay reservations
│   │   ├── BookingsController.cs           # Tee time bookings & check-in
│   │   ├── CourseHolesController.cs        # Hole yardage, handicap ratings & pars
│   │   └── AuthController.cs               # JWT authentication & user registration
│   ├── Models/
│   │   ├── Tournament.cs                   # Multi-round configuration, cuts & side contests
│   │   ├── TournamentRegistration.cs       # Player roster, pairings, madeCut & points
│   │   ├── TournamentScore.cs              # Hole scores, pars & round numbers
│   │   ├── RangeBay.cs                     # Driving range bay entity
│   │   └── Tenant.cs                       # Multi-tenant golf course definition
│   ├── DTOs/
│   │   └── TournamentDtos.cs               # Cut, pairing, skins, payouts & merit DTOs
│   ├── Data/
│   │   ├── AppDbContext.cs                 # Entity Framework Core DbContext
│   │   └── TenantMiddleware.cs             # Multi-tenant request isolation
│   └── Migrations/                         # Database schema migrations
│
├── docker-compose.yml                       # Containerized deployment configuration
└── README.md
```

---

## 📊 Key API Endpoints

### 🏆 Tournaments & Championships
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/tenants/{tenantId}/tournaments` | List club tournaments |
| `POST` | `/api/tenants/{tenantId}/tournaments` | Create 18/36/54/72-hole tournament |
| `GET` | `/api/tournaments/{id}` | Direct global lookup (TV Kiosk & Public Link) |
| `PUT` | `/api/tenants/{tenantId}/tournaments/{id}/current-round` | Advance active championship round |
| `POST` | `/api/tenants/{tenantId}/tournaments/{id}/cut` | Apply Top $N$ + Ties cut line |
| `POST` | `/api/tenants/{tenantId}/tournaments/{id}/generate-pairings` | Auto-generate group tee times |
| `PUT` | `/api/tenants/{tenantId}/tournaments/{id}/pairings/batch` | Update group tee times / disband groups |
| `POST` | `/api/tenants/{tenantId}/tournaments/{id}/scores/batch` | Record 18-hole round scores |
| `GET` | `/api/tournaments/{id}/leaderboard` | Live Gross/Net leaderboard with cut status |
| `GET` | `/api/tournaments/{id}/skins` | Hole-by-hole skins board with carryovers |
| `GET` | `/api/tournaments/{id}/payouts` | Prize purse breakdown with tie-splits |
| `GET` | `/api/tournaments/order-of-merit` | Season-long FedEx Cup points standings |

---

## 🔐 Multi-Tenant Security

- **Global Query Filters**: EF Core automatically scopes queries to the authenticated tenant.
- **Route Validation**: Custom `[TenantScoped]` attribute filter prevents cross-tenant data leakage.
- **Direct Public Endpoints**: Public viewer and TV kiosk endpoints (`/api/tournaments/{id}`) resolve tenant context safely for read-only spectating.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
