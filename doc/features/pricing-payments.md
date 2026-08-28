# Dynamic Pricing Rules & Stripe Connect Payments (Phase 3)

Comprehensive overview of the dynamic pricing engine and payments infrastructure added in Phase 3.

---

## 🏷️ 1. Dynamic Pricing Rules Engine

### Overview
Golf courses often change rates dynamically depending on day of week (weekends vs weekdays) and time of day (morning prime vs afternoon twilight). The Pricing Rules Engine evaluates a hierarchy of priority-ordered rules to automatically price tee times.

### Rule Properties
* **Name**: Descriptive label (e.g., `Weekend Morning Prime`, `Twilight Rate`).
* **Days**: `All`, `Weekday`, `Weekend`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday`.
* **StartTime & EndTime**: Optional time window (e.g., `07:00` to `11:30`).
* **Price**: Custom dollar amount per player.
* **Priority**: Integer (1–100). When multiple rules match a given tee time, the highest priority rule wins.
* **IsActive**: Toggle to enable/disable rules without deleting them.

### Evaluation Order
1. Filter tenant's active rules (`IsActive == true`).
2. Order by `Priority DESC`, `CreatedAt DESC`.
3. Check `Days` matching the tee slot's day of week.
4. Check `StartTime <= time < EndTime` (supports overnight spans).
5. First matching rule determines the slot price; otherwise fallback price is applied.

---

## 💳 2. Stripe Connect & Payments Engine

### Architecture
* **Pluggable & Zero-Config Dev Mode**: If no live Stripe API key is present in `appsettings.json`, the platform automatically runs in Sandbox mode with test cards (`4242...`, `5555...`, `3782...`) and simulated instant payouts.
* **Stripe Connect Express**: Each tenant connects their own Stripe merchant account, receiving direct deposits with no escrow holding.
* **Payment Policies**:
  * **Upfront Mandatory**: Golfers must pay online when booking.
  * **Pay at Pro Shop**: Golfers can choose between online payment or paying upon arrival.
* **Auto-Refunds**: Cancelling a paid booking triggers an automatic refund of the transaction amount to the golfer's original card, accompanied by an email confirmation receipt.

---

## 🌐 3. Custom Domain & White-Labeling

* **Resolution Middleware**: `TenantMiddleware` checks incoming `Host` headers against both `CustomDomain` and `Subdomain`.
* **CNAME Setup**: Point any custom domain (e.g., `play.pinehillgolf.com`) via a CNAME record to `cname.chipandchill.com`.
* **API Resolution**: `GET /api/tenants/resolve?host=...` returns tenant identity, custom branding, and payment configuration.

---

## 🪙 4. Multi-Currency Support

* **Default Platform Currency**: `INR` (`₹ / ₨`).
* **Supported Currencies**: `INR` (`₹`), `USD` (`$`), `EUR` (`€`), `GBP` (`£`), `AED` (`AED`), `CAD` (`C$`), `AUD` (`A$`), `SGD` (`S$`), `JPY` (`¥`).
* **Tenant Configuration**: Course admins can select their preferred currency in the onboarding wizard (`/create-course`) or in `/dashboard/branding`.
* **Dynamic Formatting**: Slot availability, pricing rules, checkout modals, and email receipts automatically adapt to the configured currency and symbol.

