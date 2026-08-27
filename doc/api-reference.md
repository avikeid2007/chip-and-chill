# API Reference

Base URL: `http://localhost:5000`

**Auth**: `Authorization: Bearer {token}` header (from `/api/auth/login` or `/api/auth/register`).
**Tenant scoping**: most tenant endpoints take `{tenantId}` in the path; the `X-Tenant-Id` header is optional.
**Enums** are accepted and returned as strings (`"Golfer"`, `"Confirmed"`, `"Course"`).

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account. Body: `{ email, password, firstName, lastName, role, tenantId? }` → `AuthResponse` |
| POST | `/login` | — | `{ email, password }` → `AuthResponse` |
| POST | `/forgot-password` | — | `{ email }` → `{ message, token }` (token returned directly in dev) |
| POST | `/reset-password` | — | `{ email, token, newPassword }` |

`AuthResponse`: `{ token, email, firstName, lastName, role, tenantId }`

---

## Users — `/api/users` 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Current user profile |
| PUT | `/me` | Update `{ firstName, lastName, phoneNumber? }` |
| PUT | `/me/password` | Change password `{ currentPassword, newPassword }` |

---

## Onboarding — `/api/onboarding` 🔒

| Method | Path | Description |
|---|---|---|
| POST | `/course` | Create tenant + holes + link creator as admin. Returns **fresh JWT**. Body: `{ name, type: "Course"\|"Range", address?, description?, timezone, logoUrl?, holes: [{ holeNumber, par, yardageWhite }] }` |
| POST | `/logo` | Multipart file upload (png/jpg/gif/webp/svg, ≤5MB) → `{ url }` |

---

## Tenants — `/api/tenants`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Public directory; `?search=` filters by name/address |
| GET | `/{id}` | — | Single tenant |
| POST | `/` | 🔒 | Create tenant (links creator as CourseAdmin if unlinked) |
| PUT | `/{id}` | 🔒 Admin | Update name/description/address/logo/color/timezone |

## Course Holes — `/api/tenants/{tenantId}/holes`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | All holes ordered by number |
| PUT | `/` | 🔒 Admin | Replace all holes: `[{ holeNumber, par, yardageWhite, ... }]` |

---

## Tee Slots & Bookings — `/api/tenants/{tenantId}/...`

### Tee Slots
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tee-slots?date=YYYY-MM-DD&includeBlocked=false` | — | Slots for a day with computed status: `open` \| `low` \| `full` \| `blocked`. Response: `{ id, startTime, maxPlayers, playersBooked, price, status }` |
| POST | `/tee-slots` | 🔒 Admin | `{ startTime, maxPlayers, price }` |
| PATCH | `/tee-slots/{slotId}` | 🔒 Admin | Block/unblock: `{ isBlocked: true }` |

### Bookings
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | 🔒 | Book: `{ teeSlotId, partySize }`. Sends confirmation email. 400 if slot full |
| GET | `/bookings/mine` | 🔒 | Caller's bookings at this tenant |
| GET | `/bookings/all?date=` | 🔒 Admin | Tenant-wide list with golfer info |
| POST | `/bookings/{id}/cancel` | 🔒 | Cancel (triggers waitlist auto-notify email) |
| POST | `/bookings/{id}/check-in` | 🔒 Admin | Set status to CheckedIn |

### Waitlist
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/tee-slots/{slotId}/waitlist` | 🔒 | Join: `{ partySize }`. Only when slot full; one per user. → `{ id, position }` |
| GET | `/tee-slots/{slotId}/waitlist/mine` | 🔒 | My entries for this slot |
| DELETE | `/tee-slots/{slotId}/waitlist/{entryId}` | 🔒 | Leave waitlist |

### Dashboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard-summary` | 🔒 Admin | `{ bookingsToday, bookingsThisWeek, upcomingBookings, totalRounds, occupancyPercent, activeSlotsToday }` |

---

## Staff — `/api/tenants/{tenantId}/staff` 🔒 CourseAdmin+

| Method | Path | Description |
|---|---|---|
| GET | `/` | List staff/admins for tenant |
| POST | `/` | Invite: `{ email, password, firstName, lastName }` (creates Staff account) |
| DELETE | `/{userId}` | Remove staff member (cannot remove CourseAdmins) |

---

## Rounds & Stats — `/api/rounds` 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/mine` | All caller's rounds with holes + differentials |
| GET | `/{id}` | Single round |
| POST | `/` | Create round: `{ tenantId, playedOn, teeBox, courseRating=72, slopeRating=113, holes: [{ holeNumber, par, strokes }] }`. Differential auto-computed |
| GET | `/stats` | Aggregate stats (see below) |

### Stats Response

```json
{
  "handicapIndex": 14.2,
  "averageScore": 85.3,
  "averageToPar": 13.3,
  "roundsPlayed": 7,
  "bestRound": { "roundId": "...", "playedOn": "...", "strokes": 82, "par": 72 },
  "trend": [{ "playedOn": "...", "strokes": 85, "par": 72, "differential": 12.2 }],
  "holes": [{ "holeNumber": 1, "avgStrokes": 5.1, "avgPar": 4.0, "birdies": 1, "pars": 4, "bogeys": 6, "doublesOrWorse": 3 }],
  "full18Rounds": 2
}
```

**WHS Handicap Index**: best-N differentials of last 20 rounds averaged × 0.96, truncated to 1dp. N by rounds available: 3-4→1, 5-6→2, 7→3, 8→4, 9→5, 10→6, 11-12→7, 13+→8.

**Differential per round**: `(totalStrokes − courseRating) × 113 ÷ slopeRating`

---

## Error Format

Validation failures return RFC 7807 problem details:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "field": ["message"] }
}
```

Common status codes: 400 (validation/business rule), 401 (no/bad token), 403 (wrong role), 404 (not found), 409 (duplicate — e.g., already on waitlist).
