# Feature: Course Onboarding & Admin

## Create Course Wizard (`/create-course`)

One-page form for a logged-in user without a course:

| Field | Notes |
|---|---|
| Logo upload | Multipart → `POST /api/onboarding/logo` → stored in `wwwroot/uploads/{guid}.{ext}`, preview shown |
| Name | Required |
| Type | Golf Course / Driving Range toggle (Range hides the hole editor) |
| Address, Description | Optional, shown on public course page |
| Timezone | Auto-detected from browser, full IANA list |
| Holes | 9/18 toggle; per-hole par (3/4/5 dropdown) + white-tee yardage; live par/yardage totals |

**Submit** → `POST /api/onboarding/course` atomically:
1. Creates the Tenant
2. Seeds all CourseHole rows
3. Links creator: `user.TenantId = tenant.Id`, promotes Golfer/Staff → **CourseAdmin**
4. Returns a **fresh JWT** containing the new `tenant_id` claim
5. Client swaps the token into AuthContext and redirects to `/dashboard`

## Admin Pages

All under `/dashboard/*`, wrapped in `AdminLayout` (sidebar nav). If the user has no `tenantId`, every page renders the **NoCourse** CTA card instead of data.

| Page | Capabilities |
|---|---|
| `/dashboard` | Live stats cards + today's bookings list |
| `/dashboard/tee-sheet` | Day's slots incl. blocked; block/unblock (PATCH); add slot (datetime + price) |
| `/dashboard/bookings` | Tenant-wide bookings, search by name/email, check-in action |
| `/dashboard/course` | Edit tenant info + replace all holes (PUT semantics) |
| `/dashboard/staff` | List staff/admins, invite (email+password), remove (Staff only — admins protected) |

## Role Enforcement

Server-side via `[Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]`:
- Slot create/block, check-in, dashboard summary → Admin or Staff
- Staff management, tenant update → CourseAdmin or SuperAdmin only
- All admin endpoints additionally scope to `{tenantId}` in the route

## Logo Serving

`app.UseStaticFiles()` serves `wwwroot/uploads/*`. The client prefixes stored URLs (`/uploads/x.png`) with the API base URL.
