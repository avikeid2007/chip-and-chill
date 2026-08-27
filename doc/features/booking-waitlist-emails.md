# Feature: Booking, Waitlist & Emails

## Booking Flow

```
Golfer opens /booking
  → GET /api/tenants (first tenant alphabetically — MVP simplification)
  → GET /api/tenants/{id}/tee-slots?date=today
  → slot statuses computed server-side:
      booked = sum(PartySize of non-cancelled bookings)
      status = blocked | full (booked>=max) | low (booked>=max-1) | open
  → click slot → POST /bookings { teeSlotId, partySize }
      - server re-validates capacity (race-safe)
      - confirmation email sent via IEmailSender
```

## Waitlist Rules

| Rule | Implementation |
|---|---|
| Only join when full | Server sums active bookings; rejects with 400 if spots remain |
| One entry per user per slot | Duplicate check → 409 Conflict |
| FIFO notification | On cancellation, earliest `JoinedAt` un-notified entry gets emailed; `Notified=true` prevents re-notification |
| Leave anytime | DELETE endpoint removes the entry |

## Email Service

`IEmailSender` with three providers selected via `appsettings.json → Email:Provider`:

| Provider | Behavior |
|---|---|
| `Console` *(default)* | Full email logged to API stdout — dev/test |
| `Smtp` | Real send via `System.Net.Mail.SmtpClient` (host/port/user/pass from config, SSL on) |
| `SendGrid` | Stub — logs warning + falls back to console (Phase 3: real API integration) |

### Emails Sent

| Trigger | Subject | Recipient |
|---|---|---|
| Booking created | `Tee time confirmed — {MMM d, h:mm tt}` | Booker |
| Cancellation + waitlist | `A tee time opened up — {MMM d, h:mm tt}` | First waitlist entry |

## Edge Cases Handled

- Cancelling a booking frees capacity immediately (cancelled excluded from booked count)
- Blocked slots are hidden from golfers but visible to admins (`includeBlocked=true`)
- Party size counts against capacity, not booking count (party of 4 fills a max-4 slot alone)
