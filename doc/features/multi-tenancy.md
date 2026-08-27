# Feature: Multi-Tenancy

## Design

Shared database with a `TenantId` column on every tenant-owned table. EF Core **global query filters** scope queries automatically.

```
ApplicationUser.TenantId (nullable)
  ├── null   → Golfer (books across all tenants)
  └── set    → CourseAdmin / Staff (scoped to one tenant)

Tenant-scoped entities: CourseHole, TeeSlot, Booking, Round, WaitlistEntry
Unscoped: Tenant itself (public directory)
```

## How Scoping Works

1. `TenantMiddleware` resolves the tenant per request:
   - `X-Tenant-Id` header (used by the SPA), or
   - subdomain (`pinehill.chipandchill.com` → looks up `Subdomain`)
2. Sets `AppDbContext.CurrentTenantId`
3. Global query filters (`HasQueryFilter`) apply automatically

Most controllers also use `.IgnoreQueryFilters()` + explicit `Where(e => e.TenantId == id)` for public cross-tenant reads (e.g., browsing a course page).

## JWT Claims

| Claim | Value |
|---|---|
| `nameidentifier` | user Id |
| `email` | user email |
| `role` | `SuperAdmin` \| `CourseAdmin` \| `Staff` \| `Golfer` |
| `tenant_id` | present only when user has a TenantId |

⚠️ The client's admin pages read `user.tenantId` from the stored AuthResponse. Any flow that links a user to a tenant **must re-issue the JWT** (see onboarding).

## Known Limitations (by design, MVP)

- One course per owner — `ApplicationUser.TenantId` is a single value. Multi-course ownership needs a `TenantMember` join table + course switcher (Phase 3+ candidate).
- Subdomain resolution is naive (first label of host); custom domains are stored but not routed.
