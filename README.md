# OpenGolf

Open source, multi-tenant booking + scorecard + course management platform for golf courses and driving ranges.

- **Client**: React + Vite + TypeScript, Tailwind CSS v4
- **API**: ASP.NET Core 8 Web API + EF Core (SQL Server or MySQL)
- **License**: MIT

## Project layout

```
opengolf/
├── client/                  # React + Vite + TypeScript frontend
│   └── src/
│       ├── pages/           # Landing, CourseBrowse, Booking, Dashboard, Login, Register
│       ├── components/      # TeeTicker, Scorecard, Leaderboard, NavBar
│       ├── api/              # auth.ts (API client), AuthContext.tsx (login state)
│       └── styles/theme.css # Design tokens (colors, fonts)
├── server/
│   ├── OpenGolf.sln
│   └── OpenGolf.Api/
│       ├── Controllers/     # Auth, Tenants, CourseHoles, Bookings, Rounds
│       ├── Models/          # EF Core entities
│       ├── Data/            # AppDbContext, TenantMiddleware
│       └── Program.cs
└── docker-compose.yml
```

## Running the API locally

**Requirements**: [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

```bash
cd server/OpenGolf.Api
dotnet restore
dotnet ef migrations add InitialCreate    # first time only (needs dotnet-ef: dotnet tool install --global dotnet-ef)
dotnet ef database update
dotnet run
```

The API defaults to **SQL Server**. To use **MySQL** instead, edit `appsettings.json`:

```json
"Database": { "Provider": "MySql" }
```

and make sure `ConnectionStrings:MySql` points at your MySQL instance.

Swagger UI is available at `https://localhost:{port}/swagger` in development.

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
