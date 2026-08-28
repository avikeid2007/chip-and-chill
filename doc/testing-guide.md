# Testing Guide

Step-by-step manual test scripts. Each section is independent — run in order for a full regression pass.

**Setup before testing:** API on :5000, client on :5173, browser open.

---

## 1. Authentication

### 1.1 Register (Golfer)
1. Go to `/register`
2. Fill first/last name, email, password (min 8 chars)
3. Select **Golfer** → **Create account**
4. ✅ Expect: redirected to home, nav shows "Hi, {FirstName}"

### 1.2 Register (Course Owner)
1. `/register` → select **Course Owner**
2. ✅ Expect: redirected to `/dashboard` showing the **"No course yet"** card with a "Create your course" button

### 1.3 Login / Logout
1. Log out (nav dropdown) → log back in at `/login`
2. ✅ Expect: Golfer → home; CourseAdmin → dashboard
3. ❌ Wrong password → "Invalid email or password."

### 1.4 Forgot / Reset Password
1. Log out → `/forgot-password` → enter email → **Send reset link**
2. ✅ Expect: reset token displayed (dev mode — no email provider configured)
3. Enter new password (min 8) → **Set new password**
4. ✅ Expect: "Password reset successfully"
5. Log in with the NEW password → works; old password fails

### 1.5 Profile Settings
1. `/profile` → change last name → **Save changes**
2. If password field filled, a prompt asks for current password
3. Refresh page → name persists (verify via `GET /api/users/me`)

---

## 2. Course Onboarding

### 2.1 Create a Course
1. As a course-less admin, click **Create your course** (or go to `/create-course`)
2. Upload a logo (png/jpg, <5MB) → preview appears
3. Name = "Test Golf Club", type = Golf Course, address, description
4. Toggle **9 holes ↔ 18 holes** → hole rows add/remove; totals update live
5. Change hole 1 par to 5 → total par updates
6. **Create course**
7. ✅ Expect: redirect to `/dashboard` with real stats (zeros), sidebar nav present
8. Verify in DB or via `GET /api/tenants/{id}/holes` — holes match what you entered

### 2.2 Logo Serving
- The uploaded logo URL (`/uploads/{guid}.png`) should return HTTP 200 with image content-type from the API host.

---

## 3. Tee Sheet & Booking (Golfer)

### 3.1 View Availability
1. As a golfer, go to `/booking`
2. ✅ Expect: today's slots listed with time, players booked/max, price, status dot (green=open, gold=low, red=full)

### 3.2 Book a Slot
1. Click an open slot → confirm panel shows time + price
2. **Confirm Booking**
3. ✅ Expect: "Booking confirmed" card
4. Check API console output — a confirmation email is logged:
   ```
   === EMAIL (console provider) ===
   Subject: Tee time confirmed — ...
   ```
5. `/bookings` shows the booking with status **Upcoming**

### 3.3 Cancel a Booking
1. On `/bookings`, click **Cancel** on an upcoming booking
2. ✅ Status flips to **Cancelled**

### 3.4 Join a Waitlist
1. Find a slot marked **Full — waitlist available** (or fill one: book it to max capacity from another account)
2. Click the full slot → panel says "fully booked... Join the waitlist"
3. **Join Waitlist**
4. ✅ Expect: "You're on the waitlist — Position #N"
5. Try joining again → 409 Conflict ("already on the waitlist")
6. Try joining a non-full slot via API → 400 ("still has open spots")

### 3.5 Waitlist Auto-Notify
1. With someone on a full slot's waitlist, cancel one booking on that slot (as the booker or admin)
2. ✅ API console logs the waitlist email: `Subject: A tee time opened up — ...`
3. The notified entry's flag flips (`GET .../waitlist/mine` → `notified: true`) and won't be emailed twice

---

## 4. Scorecards & Stats (Golfer)

### 4.1 Log a Round
1. `/rounds/new`
2. ✅ Hole row loads from the course's actual holes (par per hole pre-filled)
3. Adjust scores → total updates live
4. Pick tee box → **Save round**
5. ✅ Redirect to `/rounds`; new round listed with score, ±to-par, and **differential**

### 4.2 Round Detail
1. Click any round in history
2. ✅ Full scorecard grid renders with all hole scores and OUT total

### 4.3 Stats Dashboard
1. `/stats` (or 📊 Stats button on round history)
2. ✅ Hero card: Handicap Index, rounds played, avg score, avg vs par, best round
3. ✅ Score trend line chart (hover points for date+score tooltips)
4. ✅ Hole performance bars (green = par portion, red = over-par strokes)
5. ✅ "By the numbers" table: birdies/pars/bogeys/doubles per hole
6. New account with no rounds → empty state message

> **Handicap math check**: differential = (strokes − courseRating) × 113 ÷ slopeRating. Index = avg of best N of last 20 × 0.96 (N scales: 3-4 rounds→1, 5-6→2, 7→3, 8→4, 9→5, 10→6, 11-12→7, 13+→8), truncated to 1 decimal.

---

## 5. Admin Dashboard (CourseAdmin/Staff)

Log in as an admin linked to a course with slots/bookings.

### 5.1 Dashboard Home
1. `/dashboard`
2. ✅ Stat cards: bookings today, this week, occupancy %, rounds logged — all real numbers
3. ✅ Today's tee sheet lists bookings with golfer name + status

### 5.2 Tee Sheet Manager
1. `/dashboard/tee-sheet`
2. ✅ All slots for today including blocked ones (dimmed)
3. **Block** a slot → opacity drops; verify golfer `/booking` no longer shows it
4. **Unblock** → returns
5. Add a tee time via datetime picker + price → appears in list

### 5.3 Bookings Management
1. `/dashboard/bookings`
2. ✅ All tenant bookings (all golfers), searchable by name/email
3. **Check in** a confirmed booking → status becomes **CheckedIn**, button disappears

### 5.4 Course Editor
1. `/dashboard/course`
2. Edit name/description/hole pars/yardages → **Save changes**
3. Reload → values persist; public course page reflects them

### 5.5 Staff Accounts
1. `/dashboard/staff`
2. Invite: first/last/email/password → staff appears in list
3. Log in as that staff user → can access admin pages for the tenant
4. **Remove** → gone from list; their login no longer works

### 5.6 No-Course Guard
1. Log in as an admin with no tenant (fresh Course Owner registration)
2. Visit any `/dashboard/*` page
3. ✅ "No course yet" card with CTA instead of errors

---

## 6. Multi-Tenancy Isolation

1. Create two courses (two admin accounts)
2. Add slots to both
3. As golfer, book at course A
4. Log into course B's admin → `/dashboard/bookings`
5. ✅ Course B does NOT see course A's bookings
6. Golfer's `/bookings` shows bookings across BOTH courses (cross-tenant golfer view)

---

---

## 7. Dynamic Pricing Rules (Course Admin)

### 7.1 Create a Pricing Rule
1. Log in as `admin@pinehollow.test` → go to `/dashboard/pricing`
2. Click **+ Add Pricing Rule**
3. Name: `Weekend Morning Surge`, Days: `Weekends (Sat & Sun)`, Start: `07:00`, End: `11:30`, Price: `75.00`, Priority: `3`
4. ✅ Rule appears in the list with active badge.

### 7.2 Price Simulator
1. In the **Live Price Simulator** on `/dashboard/pricing`:
2. Pick an upcoming Saturday at `08:30` → **Test Dynamic Price**
3. ✅ Expect: Calculated Rate `$75.00` with `Matched Rule: Weekend Morning Surge`.
4. Pick a Tuesday at `10:00` → **Test Dynamic Price**
5. ✅ Expect: Fallback base rate (e.g. `$50.00`).

---

## 8. Stripe Connect & Payments (Course Admin & Golfer)

### 8.1 Connect Stripe Payouts
1. Go to `/dashboard/payouts`
2. Click **Connect with Stripe**
3. ✅ Status flips to **Connected & Active** (Sandbox mode).
4. Select **Require 100% Upfront Payment Online** → Policy updates.

### 8.2 Golfer Online Checkout
1. Log in as golfer (`smoketest@example.com`) → go to `/booking`
2. Click an open slot → verify total amount calculation.
3. Click **Pay & Confirm** → Checkout Modal appears.
4. Click **Visa 4242** quick-fill button → **Pay $XX.XX**
5. ✅ Status updates to "Tee Time Confirmed" with receipt.
6. Verify email log in API console: `Payment Receipt — Tee time ...`
7. Check `/bookings` → booking displays `✓ Paid $XX.XX`.

### 8.3 Cancellation & Auto-Refund
1. On `/bookings`, click **Cancel & Refund** on the paid booking.
2. Confirm dialog → Status updates to `Cancelled`.
3. Check `/dashboard/bookings` as admin → payment status shows `Refunded`.
4. Check API console log → `Refund Processed — $XX.XX` email dispatched.

---

## 9. API Smoke Tests (PowerShell)

```powershell
# Health
Invoke-RestMethod http://localhost:5000/api/tenants

# Register
$body = @{ email="t@t.com"; password="Passw0rd!"; firstName="T"; lastName="U"; role="Golfer" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5000/api/auth/register -Method Post -ContentType "application/json" -Body $body

# Login + authed call
$login = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post -ContentType "application/json" -Body (@{email="t@t.com";password="Passw0rd!"}|ConvertTo-Json)
$hdr = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod http://localhost:5000/api/users/me -Headers $hdr
Invoke-RestMethod http://localhost:5000/api/rounds/stats -Headers $hdr
```

See [api-reference.md](./api-reference.md) for every endpoint.

