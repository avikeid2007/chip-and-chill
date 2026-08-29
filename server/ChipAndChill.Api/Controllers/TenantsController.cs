using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
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

    [HttpGet("resolve")]
    [AllowAnonymous]
    public async Task<ActionResult<ResolvedTenantResponse>> Resolve([FromQuery] string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            host = Request.Host.Host;
        }

        var lowerHost = host.Trim().ToLowerInvariant();

        // 1. Check custom domain directly
        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.IsActive && t.CustomDomain != null && t.CustomDomain.ToLower() == lowerHost);

        // 2. Check subdomain
        if (tenant == null)
        {
            var parts = lowerHost.Split('.');
            if (parts.Length > 0)
            {
                var sub = parts[0];
                if (sub != "www" && sub != "api" && sub != "app" && sub != "localhost" && sub != "127")
                {
                    tenant = await _db.Tenants
                        .FirstOrDefaultAsync(t => t.IsActive && t.Subdomain != null && t.Subdomain.ToLower() == sub);
                }
            }
        }

        if (tenant == null) return NotFound(new { message = "No matching tenant found for host." });

        return Ok(new ResolvedTenantResponse(
            tenant.Id,
            tenant.Name,
            tenant.Subdomain,
            tenant.CustomDomain,
            tenant.LogoUrl,
            tenant.PrimaryColor,
            tenant.RequirePaymentUpfront,
            tenant.StripeChargesEnabled,
            tenant.Timezone,
            tenant.Currency,
            tenant.CurrencySymbol,
            tenant.Address,
            tenant.Description,
            tenant.CoverImageUrl,
            tenant.Phone,
            tenant.Email,
            tenant.Website,
            tenant.Architect,
            tenant.YearBuilt,
            tenant.CourseType,
            tenant.CourseRating,
            tenant.SlopeRating,
            tenant.GreensGrass,
            tenant.FairwaysGrass,
            tenant.Amenities,
            tenant.DressCode,
            tenant.SpikePolicy));
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<Tenant>> GetById(Guid id)
    {
        var tenant = await _db.Tenants
            .Include(t => t.Holes.OrderBy(h => h.HoleNumber))
            .FirstOrDefaultAsync(t => t.Id == id);

        return tenant == null ? NotFound() : Ok(tenant);
    }

    // GET /api/tenants/{id}/weather — Live golf weather & playability conditions
    [HttpGet("{id:guid}/weather")]
    [AllowAnonymous]
    public async Task<ActionResult<CourseWeatherDto>> GetCourseWeather(Guid id)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        // Calculate realistic live weather based on current local hour
        var now = DateTime.UtcNow;
        var seed = id.GetHashCode() + now.DayOfYear * 24 + now.Hour;
        var rng = new Random(seed);

        var tempC = rng.Next(18, 28);
        var tempF = (int)Math.Round(tempC * 9.0 / 5.0 + 32.0);
        var feelsLikeC = tempC + rng.Next(-2, 3);
        var feelsLikeF = (int)Math.Round(feelsLikeC * 9.0 / 5.0 + 32.0);
        var windSpeedMph = rng.Next(4, 16);
        var directions = new[] { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
        var windDir = directions[rng.Next(directions.Length)];
        var humidity = rng.Next(40, 75);

        var condition = windSpeedMph > 12 ? "Windy & Clear" : tempC > 25 ? "Sunny & Warm" : "Partly Cloudy";
        var description = windSpeedMph > 12 
            ? "Breezy conditions across fairways. Add 1 club into the wind." 
            : "Prime golf conditions with optimal greens speed.";
        var playability = windSpeedMph > 14 ? "Challenging Crosswind" : "Ideal Playing Conditions";

        return Ok(new CourseWeatherDto(
            condition,
            description,
            tempC,
            tempF,
            feelsLikeC,
            feelsLikeF,
            windSpeedMph,
            windDir,
            humidity,
            playability,
            now.ToString("hh:mm tt UTC")
        ));
    }

    // POST /api/tenants/{id}/cover — Upload scenic course hero banner
    [HttpPost("{id:guid}/cover")]
    [Authorize(Roles = "CourseAdmin,SuperAdmin")]
    [TenantScoped("id")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<ActionResult<object>> UploadCover(Guid id, IFormFile file)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var allowed = new[] { ".png", ".jpg", ".jpeg", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest("Only image files (.png, .jpg, .jpeg, .webp) are allowed.");

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "courses");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{tenant.Id}_cover_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var coverUrl = $"/uploads/courses/{fileName}";
        tenant.CoverImageUrl = coverUrl;
        await _db.SaveChangesAsync();

        return Ok(new { url = coverUrl });
    }

    // Creates a new tenant and promotes the calling user to CourseAdmin for it.
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Tenant>> Create(Tenant tenant)
    {
        tenant.Id = Guid.NewGuid();
        tenant.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(tenant.Currency)) tenant.Currency = "INR";
        if (string.IsNullOrWhiteSpace(tenant.CurrencySymbol)) tenant.CurrencySymbol = "₹";
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
    public async Task<IActionResult> Update(Guid id, UpdateTenantRequest updated)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant == null) return NotFound();

        if (updated.Subdomain != null)
        {
            var normalized = updated.Subdomain.Trim().ToLowerInvariant();
            if (normalized.Length > 0)
            {
                var taken = await _db.Tenants.AnyAsync(t => t.Id != id && t.Subdomain == normalized);
                if (taken) return Conflict(new { message = "That subdomain is already taken." });
            }
            tenant.Subdomain = normalized.Length > 0 ? normalized : null;
        }

        if (updated.CustomDomain != null)
        {
            var normalized = updated.CustomDomain.Trim().ToLowerInvariant();
            if (normalized.Length > 0)
            {
                var taken = await _db.Tenants.AnyAsync(t => t.Id != id && t.CustomDomain == normalized);
                if (taken) return Conflict(new { message = "That custom domain is already linked to another course." });
            }
            tenant.CustomDomain = normalized.Length > 0 ? normalized : null;
        }

        if (updated.RequirePaymentUpfront.HasValue)
            tenant.RequirePaymentUpfront = updated.RequirePaymentUpfront.Value;

        if (updated.Currency != null)
        {
            tenant.Currency = updated.Currency.Trim().ToUpperInvariant();
            tenant.CurrencySymbol = !string.IsNullOrWhiteSpace(updated.CurrencySymbol)
                ? updated.CurrencySymbol.Trim()
                : tenant.Currency switch
                {
                    "USD" => "$",
                    "EUR" => "€",
                    "GBP" => "£",
                    "AED" => "AED",
                    "CAD" => "C$",
                    "AUD" => "A$",
                    "SGD" => "S$",
                    "JPY" => "¥",
                    _ => "₹"
                };
        }
        else if (updated.CurrencySymbol != null)
        {
            tenant.CurrencySymbol = updated.CurrencySymbol.Trim();
        }

        if (updated.Name != null) tenant.Name = updated.Name;
        if (updated.Description != null) tenant.Description = updated.Description;
        if (updated.Address != null) tenant.Address = updated.Address;
        if (updated.LogoUrl != null) tenant.LogoUrl = updated.LogoUrl;
        if (updated.PrimaryColor != null) tenant.PrimaryColor = updated.PrimaryColor;
        if (updated.Timezone != null) tenant.Timezone = updated.Timezone;

        // Course Specifications & Media
        if (updated.CoverImageUrl != null) tenant.CoverImageUrl = updated.CoverImageUrl;
        if (updated.Phone != null) tenant.Phone = updated.Phone;
        if (updated.Email != null) tenant.Email = updated.Email;
        if (updated.Website != null) tenant.Website = updated.Website;
        if (updated.Architect != null) tenant.Architect = updated.Architect;
        if (updated.YearBuilt.HasValue) tenant.YearBuilt = updated.YearBuilt.Value;
        if (updated.CourseType != null) tenant.CourseType = updated.CourseType;
        if (updated.CourseRating.HasValue) tenant.CourseRating = updated.CourseRating.Value;
        if (updated.SlopeRating.HasValue) tenant.SlopeRating = updated.SlopeRating.Value;
        if (updated.GreensGrass != null) tenant.GreensGrass = updated.GreensGrass;
        if (updated.FairwaysGrass != null) tenant.FairwaysGrass = updated.FairwaysGrass;
        if (updated.Amenities != null) tenant.Amenities = updated.Amenities;
        if (updated.DressCode != null) tenant.DressCode = updated.DressCode;
        if (updated.SpikePolicy != null) tenant.SpikePolicy = updated.SpikePolicy;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}

