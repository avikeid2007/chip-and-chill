# ⛳ Chip & Chill

A modern, multi-tenant golf course management platform with real-time booking, scorecard tracking, handicap calculations, and staff management. Built for golf courses and driving ranges of any size.

**Live Demo**: Coming soon  
**GitHub Repository**: [avikeid2007/chip-and-chill](https://github.com/avikeid2007/chip-and-chill)  
**License**: MIT

---

## ✨ Features

### For Golfers
- 🏌️ **Browse Courses** — Discover active golf courses and driving ranges
- 📅 **Book Tee Times** — Reserve slots with real-time availability
- ⏳ **Waitlist** — Join waitlists for full tee times, get notified when slots open
- 📊 **Track Rounds** — Log scores and course details for every round
- 📈 **Handicap Index** — WHS-compliant handicap calculation (best 8 of last 20)
- 📉 **Statistics** — Visualize performance trends, per-hole breakdown, average scores
- 🔔 **Email Notifications** — Confirmation and waitlist notifications

### For Course Admins
- 🏢 **Course Management** — Configure holes (par, handicap, yardage), manage tee times
- 👥 **Staff Management** — Invite staff accounts, manage permissions
- 📋 **Tee Sheet** — Visual tee sheet management, check-in staff
- 📊 **Dashboard** — Real-time bookings, player counts, revenue metrics
- 🎯 **Hole Configuration** — Set course ratings and slope for handicap calculations

### For Super Admin
- 🌐 **Platform Overview** — Real-time stats (active tenants, users, bookings, rounds)
- 🏌️ **Tenant Management** — Browse all courses, suspend/reactivate as needed
- 👤 **User Analytics** — Golfer, staff, and admin counts across the platform

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7 |
| **Backend** | ASP.NET Core 10, Entity Framework Core, ASP.NET Identity |
| **Database** | MySQL 8 (production-ready) or SQL Server (local dev) |
| **Authentication** | JWT tokens with role-based access control |
| **API Docs** | Swagger/OpenAPI (Swashbuckle) |
| **Email** | Configurable (Console, SMTP, SendGrid) |

---

## 🚀 Quick Start

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- MySQL 8+ (or SQL Server)

### 1. Clone the Repository
```bash
git clone https://github.com/avikeid2007/chip-and-chill.git
cd chip-and-chill
```

### 2. Database Setup

**For MySQL:**
1. Create a database:
   ```sql
   CREATE DATABASE openGolfDev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Update connection string in `server/ChipAndChill.Api/appsettings.json`:
   ```json
   "ConnectionStrings": {
     "MySql": "Server=localhost;Port=3306;Database=openGolfDev;User=root;Password=yourpassword"
   },
   "Database": { "Provider": "MySql" }
   ```

**For SQL Server:**
- Connection string: `server/ChipAndChill.Api/appsettings.json` (default `Database:Provider: "SqlServer"`)

### 3. Apply Migrations
```bash
cd server/ChipAndChill.Api
dotnet tool install --global dotnet-ef  # if not already installed
dotnet ef database update
```

### 4. Backend Setup
```bash
cd server/ChipAndChill.Api
dotnet restore
dotnet run
```
API runs on **http://localhost:5000**  
Swagger UI: **[http://localhost:5000/swagger/index.html](http://localhost:5000/swagger/index.html)**

### 5. Frontend Setup (new terminal)
```bash
cd client
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**

---

## 📁 Project Structure

```
chip-and-chill/
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx             # Marketing homepage
│   │   │   ├── Login.tsx & Register.tsx # Auth flows
│   │   │   ├── CourseBrowse.tsx        # Course directory
│   │   │   ├── Booking.tsx             # Tee time booking + waitlist
│   │   │   ├── Dashboard.tsx           # Golfer round history
│   │   │   ├── ScorecardEntry.tsx      # Score logging
│   │   │   ├── RoundDetail.tsx         # Round review
│   │   │   ├── StatsDashboard.tsx      # Handicap & stats
│   │   │   ├── CourseEditor.tsx        # Admin: hole config
│   │   │   ├── TeeSheetManager.tsx     # Admin: tee sheet
│   │   │   ├── StaffAccounts.tsx       # Admin: staff management
│   │   │   ├── SuperAdminDashboard.tsx # Platform stats
│   │   │   └── SuperAdminTenants.tsx   # Platform tenant mgmt
│   │   ├── components/
│   │   │   ├── NavBar.tsx              # Main navigation
│   │   │   ├── AdminLayout.tsx         # Course admin sidebar
│   │   │   ├── SuperAdminLayout.tsx    # Platform admin sidebar
│   │   │   ├── TeeTicker.tsx           # Tee time visual
│   │   │   ├── Scorecard.tsx           # Score entry form
│   │   │   └── Leaderboard.tsx         # Round leaderboard
│   │   ├── api/
│   │   │   ├── auth.ts                 # Auth API client
│   │   │   ├── bookings.ts             # Booking endpoints
│   │   │   ├── course.ts               # Course CRUD
│   │   │   ├── rounds.ts               # Round & score endpoints
│   │   │   ├── superAdmin.ts           # Platform admin endpoints
│   │   │   ├── AuthContext.tsx         # Global auth state
│   │   │   └── client.ts               # HTTP wrapper
│   │   └── styles/theme.css            # Design tokens
│   └── package.json
│
├── server/                              # .NET backend
│   ├── ChipAndChill.sln
│   └── ChipAndChill.Api/
│       ├── Controllers/
│       │   ├── AuthController.cs       # Login, register, password reset
│       │   ├── TenantsController.cs    # Course CRUD + directory
│       │   ├── CourseHolesController.cs # Hole configuration
│       │   ├── BookingsController.cs   # Tee slots & bookings
│       │   ├── RoundsController.cs     # Score tracking & stats
│       │   ├── StaffController.cs      # Staff account management
│       │   └── SuperAdminController.cs # Platform-wide stats & tenant mgmt
│       ├── Models/
│       │   ├── ApplicationUser.cs      # Identity user (+ tenant/role)
│       │   ├── Tenant.cs               # Golf course/range
│       │   ├── CourseHole.cs           # Par, handicap, yardage
│       │   ├── TeeSlot.cs              # Bookable time slot
│       │   ├── Booking.cs              # Player reservation
│       │   ├── Round.cs                # Completed round with scores
│       │   └── WaitlistEntry.cs        # Waitlist entry
│       ├── Data/
│       │   ├── AppDbContext.cs         # EF Core DbContext
│       │   ├── TenantMiddleware.cs     # Multi-tenant isolation
│       │   └── Migrations/             # EF migrations
│       ├── Security/
│       │   └── TenantScopedAttribute.cs # Route parameter validation
│       ├── Services/
│       │   ├── EmailSender.cs          # Email provider abstraction
│       │   └── ...
│       ├── appsettings.json            # Config (DB, email, JWT)
│       ├── Program.cs                  # DI & middleware setup
│       └── Properties/launchSettings.json
│
├── docker-compose.yml                  # MySQL + optional services
└── README.md
```

---

## 🔐 Authentication & Authorization

### Roles
- **SuperAdmin** — Full platform access (stats, tenant management)
- **CourseAdmin** — Owns/manages one course (staff, holes, tee sheets)
- **Staff** — Course employee (check-in, manage bookings)
- **Golfer** — Default player role (book tee times, log scores)

### Multi-Tenant Isolation
- Each user (except SuperAdmin) belongs to exactly one tenant
- JWT claims include `tenant_id` for tenant-scoped endpoints
- Route parameters validated via `[TenantScoped]` attribute filter
- Mismatched access → 403 Forbidden

---

## 🌍 Environment Variables

### Backend (`server/ChipAndChill.Api/appsettings.json`)
```json
{
  "ConnectionStrings": {
    "MySql": "Server=localhost;Port=3306;Database=openGolfDev;User=root;Password=...",
    "SqlServer": "Server=.;Database=openGolfDev;Integrated Security=true;"
  },
  "Database": {
    "Provider": "MySql"  // or "SqlServer"
  },
  "Jwt": {
    "Secret": "your-secret-key-min-32-chars",
    "Issuer": "chip-and-chill",
    "Audience": "chip-and-chill-users"
  },
  "Email": {
    "Provider": "Console"  // or "Smtp", "SendGrid"
  }
}
```

### Frontend (`.env` or Vite config)
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 📊 API Endpoints Overview

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants` | Browse active courses |
| GET | `/api/tenants/{id}` | Course details |
| POST | `/api/auth/register` | Sign up |
| POST | `/api/auth/login` | Sign in |

### Golfer-Scoped
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tee-slots?tenantId=...` | Available slots |
| POST | `/api/bookings` | Book a tee time |
| DELETE | `/api/bookings/{id}` | Cancel booking |
| GET | `/api/rounds` | My rounds |
| POST | `/api/rounds` | Log a round |
| GET | `/api/rounds/stats` | Handicap & stats |
| POST | `/api/tee-slots/{id}/waitlist` | Join waitlist |
| DELETE | `/api/tee-slots/{id}/waitlist/{entryId}` | Leave waitlist |

### Admin-Scoped
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/holes` | Configure course holes |
| POST | `/api/tee-slots` | Create tee slot |
| PATCH | `/api/tee-slots/{id}` | Update tee slot |
| GET | `/api/bookings/all` | All bookings for course |
| POST | `/api/bookings/{id}/check-in` | Check in player |
| GET | `/api/dashboard-summary` | Course metrics |
| POST | `/api/staff/invite` | Invite staff member |
| DELETE | `/api/staff/{userId}` | Remove staff member |

### SuperAdmin-Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/tenants` | All tenants (searchable) |
| PATCH | `/api/admin/tenants/{id}/status` | Suspend/reactivate tenant |

Full API documentation available at Swagger UI.

---

## 🧪 Testing

### Test Accounts
| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| `superadmin@chipandchill.dev` | `SuperPass123!` | SuperAdmin | — |
| `admin@chipandchill.dev` | `AdminPass123!` | CourseAdmin | Cedar Ridge |
| `golfer@chipandchill.dev` | `GolferPass123!` | Golfer | — |

### Running Tests
```bash
# Frontend
cd client
npm run test

# Backend
cd server/ChipAndChill.Api
dotnet test
```

---

## 📈 Key Features Deep Dive

### Handicap System
- **WHS Compliant** — Calculates handicap index from best 8 of last 20 rounds
- **Differential** — For each round: `(Strokes - Course Rating) × 113 / Slope Rating`
- **Scaling** — Adjusts for rounds under 20 using official WHS table
- **Stats Page** — Visual charts, trend analysis, per-hole breakdown

### Booking & Waitlist
- **Tee Slots** — 1-hour booking windows with player capacity (4-person default)
- **Status Tracking** — Open, Low (1-2 players), Full, Blocked
- **Waitlist** — Queue when full, automated email on cancellation
- **Check-In** — Staff marks players as checked-in for scorekeeping

### Multi-Tenant Isolation
- **Global Query Filters** — EF Core auto-filters by TenantId
- **Route Validation** — `[TenantScoped]` attribute prevents cross-tenant access
- **JWT Claims** — `tenant_id` carried in token, validated on admin endpoints
- **SuperAdmin Bypass** — Platform admins can access all tenants

---

## 🐛 Troubleshooting

### API Won't Start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Restart
cd server/ChipAndChill.Api
dotnet run
```

### Database Connection Error
- Verify MySQL/SQL Server is running
- Check connection string in `appsettings.json`
- Ensure database exists: `openGolfDev`

### CORS Errors
- Frontend (port 5173) must match backend CORS policy in `Program.cs`
- Current: `AllowAnyOrigin()` for dev (change in production!)

### Migrations Fail
```bash
# Reset to clean state (removes all data!)
dotnet ef database drop --force
dotnet ef database update
```

---

## 📝 Development Notes

### Code Style
- **Backend**: C# conventions (PascalCase classes, _camelCase privates)
- **Frontend**: React hooks, functional components, TypeScript strict mode
- **Database**: Snake_case columns, PascalCase model properties

### Common Patterns
- **DTOs** — All API responses use DTOs (never return entities)
- **Error Handling** — Catch serialization cycles, return meaningful HTTP status codes
- **Testing** — Arrange-Act-Assert pattern, mock external services

### Gotchas
- Changing `tenantId` in JWT requires login again (new token issued)
- Signup returns only basic user (no tenant), needs `/api/onboarding/course` for admin creation
- Full tee slots still clickable (leads to waitlist option, not booking)
- 9-hole rounds vs 18-hole course ratings produce inaccurate handicaps (MVP limitation)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

---

## 📧 Support

For questions or issues:
- Open a [GitHub Issue](https://github.com/avikeid2007/chip-and-chill/issues)
- Check [Discussions](https://github.com/avikeid2007/chip-and-chill/discussions)

---

**Made with ⛳ for golfers. Built for the future of course management.**

## Running the client locally

**Requirements**: Node.js 20+

```bash
cd client
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Running everything with Docker Compose

```bash
docker compose up --build
```

This starts SQL Server, the API (port 5000), and the built client (port 5173) together.

## Authentication

Register/Login pages live at `/register` and `/login` in the client, calling the API's `/api/auth/register` and `/api/auth/login` endpoints. On success, the JWT and user profile are kept in `sessionStorage` via `AuthContext` (`src/api/AuthContext.tsx`), and `NavBar` switches between "Log in / Book a Tee Time" and a logged-in state automatically.

The client expects the API at `http://localhost:5000` by default — override with a `VITE_API_BASE_URL` env var (e.g. in a `client/.env` file) if your API runs elsewhere.

## Multi-tenancy

Every tenant-owned table (`CourseHole`, `TeeSlot`, `Booking`, `Round`) carries a `TenantId`. The API resolves the current tenant per-request via the `X-Tenant-Id` header (or subdomain in production) and applies it as an EF Core global query filter, so a single query can't leak data across tenants. See `TenantMiddleware.cs` and `AppDbContext.cs`.

## Roadmap

See `golf-platform-plan.md` for the full phased roadmap (payments, pricing rules, tournaments, driving range mode, plugin API).
