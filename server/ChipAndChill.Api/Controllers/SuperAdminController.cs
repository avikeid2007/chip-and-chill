using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Controllers;

public record PlatformStatsResponse(int TotalTenants, int ActiveTenants, int TotalGolfers, int TotalCourseAdmins, int TotalStaff, int TotalBookings, int TotalRounds);
public record AdminTenantResponse(Guid Id, string Name, TenantType Type, string? Address, bool IsActive, DateTime CreatedAt, int StaffCount, int BookingCount);
public record SetTenantActiveRequest(bool IsActive);

// Platform-wide views for the Super Admin role — spans all tenants, bypassing
// the per-tenant scoping every other controller enforces.
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class SuperAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public SuperAdminController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<PlatformStatsResponse>> GetStats()
    {
        var totalTenants = await _db.Tenants.CountAsync();
        var activeTenants = await _db.Tenants.CountAsync(t => t.IsActive);
        var totalGolfers = await _userManager.Users.CountAsync(u => u.Role == AppRole.Golfer);
        var totalCourseAdmins = await _userManager.Users.CountAsync(u => u.Role == AppRole.CourseAdmin);
        var totalStaff = await _userManager.Users.CountAsync(u => u.Role == AppRole.Staff);
        var totalBookings = await _db.Bookings.IgnoreQueryFilters().CountAsync();
        var totalRounds = await _db.Rounds.IgnoreQueryFilters().CountAsync();

        return Ok(new PlatformStatsResponse(totalTenants, activeTenants, totalGolfers, totalCourseAdmins, totalStaff, totalBookings, totalRounds));
    }

    [HttpGet("tenants")]
    public async Task<ActionResult<IEnumerable<AdminTenantResponse>>> GetTenants([FromQuery] string? search)
    {
        var query = _db.Tenants.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Name.Contains(search) || (t.Address != null && t.Address.Contains(search)));

        var tenants = await query.OrderBy(t => t.Name).ToListAsync();

        var staffCounts = await _userManager.Users
            .Where(u => u.TenantId != null && (u.Role == AppRole.CourseAdmin || u.Role == AppRole.Staff))
            .GroupBy(u => u.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync();

        var bookingCounts = await _db.Bookings.IgnoreQueryFilters()
            .GroupBy(b => b.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(tenants.Select(t => new AdminTenantResponse(
            t.Id,
            t.Name,
            t.Type,
            t.Address,
            t.IsActive,
            t.CreatedAt,
            staffCounts.FirstOrDefault(s => s.TenantId == t.Id)?.Count ?? 0,
            bookingCounts.FirstOrDefault(b => b.TenantId == t.Id)?.Count ?? 0)));
    }

    // PATCH /api/admin/tenants/{id}/status — suspend or reactivate a tenant.
    [HttpPatch("tenants/{id:guid}/status")]
    public async Task<IActionResult> SetTenantStatus(Guid id, SetTenantActiveRequest req)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        tenant.IsActive = req.IsActive;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
