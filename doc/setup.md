# Setup Guide

## Prerequisites

- **.NET 8 SDK** (`dotnet --version` → 8.x)
- **Node.js 18+** (`node --version`)
- **MySQL** — a reachable server (the dev DB is remote at `140.238.253.216`)

## 1. Database Configuration

Edit `server/OpenGolf.Api/appsettings.json`:

```json
"Database": {
  "Provider": "MySql"
},
"ConnectionStrings": {
  "MySql": "Server=YOUR_HOST;Port=3306;Database=openGolfDev;User=USER;Password=PASSWORD;CharSet=utf8mb4"
}
```

Supported providers: `"MySql"` (Pomelo) or `"SqlServer"`.

### Apply Migrations

From `server/OpenGolf.Api/`:

```powershell
dotnet ef database update
```

Applied migrations so far:
1. `InitialCreate` — all tables (Identity, Tenants, TeeSlots, Bookings, Rounds, CourseHoles)
2. `AddRoundRatings` — CourseRating + SlopeRating on Rounds
3. `AddWaitlist` — WaitlistEntries table

## 2. Run the API

```powershell
cd server/OpenGolf.Api
dotnet run --urls "http://localhost:5000"
```

Verify: open http://localhost:5000/swagger (dev) or `curl http://localhost:5000/api/tenants` → `[]`

> The client expects the API on port **5000** (default in `client/src/api/client.ts`, overridable via `VITE_API_BASE_URL`).

## 3. Run the Client

```powershell
cd client
npm install    # first time only
npm run dev
```

Open **http://localhost:5173**

## 4. Email Provider (optional)

Default is `Console` (emails logged to API stdout). To use real SMTP:

```json
"Email": {
  "Provider": "Smtp",
  "Host": "smtp.gmail.com",
  "Port": 587,
  "Username": "you@gmail.com",
  "Password": "app-password",
  "FromEmail": "noreply@yourcourse.com",
  "FromName": "Your Course"
}
```

## 5. First-Time Data Setup

The app starts empty. Recommended order:

1. Register at `/register` as **Course Owner** → creates an admin account
2. You'll be redirected to the dashboard → click **"Create your course"**
3. Fill course details, upload logo (optional), set holes (9 or 18), save
4. Go to **Tee Sheet** manager → add tee slots for today
5. Register another account as **Golfer** → book a slot from `/booking`

Or use the seeded test accounts (see [README](./README.md#-test-accounts)) which already have data.

## Troubleshooting

| Problem | Fix |
|---|---|
| Client shows CORS errors | Ensure API is running and CORS origin includes `http://localhost:5173` |
| "No IUserTwoFactorTokenProvider named 'Default'" | Already fixed — requires `.AddDefaultTokenProviders()` in Program.cs |
| Slots don't appear on booking page | Booking page uses the **first tenant alphabetically** — check that tenant has slots for today |
| Migration fails to connect | Check MySQL host firewall allows your IP |
