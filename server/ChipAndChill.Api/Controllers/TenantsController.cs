using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public TenantsController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    // Public directory - browse all active courses/ranges. Not tenant-scoped
    // by design, since this is how golfers discover tenants in the first place.
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Tenant>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Tenants.Where(t => t.IsActive).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Name.Contains(search) || (t.Address != null && t.Address.Contains(search)));

        return Ok(await query.OrderBy(t => t.Name).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<Tenant>> GetById(Guid id)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        return tenant == null ? NotFound() : Ok(tenant);
    }

    // Creates a new tenant and promotes the calling user to CourseAdmin for it.
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Tenant>> Create(Tenant tenant)
    {
        tenant.Id = Guid.NewGuid();
        tenant.CreatedAt = DateTime.UtcNow;
        _db.Tenants.Add(tenant);

        // Link the creator to the tenant as its Course Admin (if they aren't
        // already an admin of another course).
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user != null && !user.TenantId.HasValue)
            {
                user.TenantId = tenant.Id;
                if (user.Role == AppRole.Golfer)
                    user.Role = AppRole.CourseAdmin;
                await _userManager.UpdateAsync(user);
            }
        }

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "CourseAdmin,SuperAdmin")]
    [TenantScoped("id")]
    public async Task<IActionResult> Update(Guid id, Tenant updated)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        tenant.Name = updated.Name;
        tenant.Description = updated.Description;
        tenant.Address = updated.Address;
        tenant.LogoUrl = updated.LogoUrl;
        tenant.PrimaryColor = updated.PrimaryColor;
        tenant.Timezone = updated.Timezone;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}

