using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

public record CreateCourseRequest(
    string Name,
    string Type,            // "Course" | "Range"
    string? Address,
    string? Description,
    string Timezone,
    string? LogoUrl,
    string? Currency,
    string? CurrencySymbol,
    List<HoleSeedInput> Holes);
public record HoleSeedInput(int HoleNumber, int Par, int YardageWhite);

[ApiController]
[Route("api/onboarding")]
[Authorize]
public class OnboardingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    public OnboardingController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IConfiguration config)
    {
        _db = db;
        _userManager = userManager;
        _config = config;
    }

    // POST /api/onboarding/course — creates a tenant + its holes in one call,
    // links the creator as Course Admin, and returns a fresh JWT (the old
    // token lacks the new tenant_id claim).
    [HttpPost("course")]
    public async Task<ActionResult<AuthResponse>> CreateCourse(CreateCourseRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Course name is required.");

        var currencyCode = string.IsNullOrWhiteSpace(req.Currency) ? "INR" : req.Currency.Trim().ToUpperInvariant();
        var currencySymbol = !string.IsNullOrWhiteSpace(req.CurrencySymbol)
            ? req.CurrencySymbol.Trim()
            : currencyCode switch
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

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = req.Name.Trim(),
            Type = req.Type == "Range" ? TenantType.Range : TenantType.Course,
            Address = req.Address,
            Description = req.Description,
            Timezone = string.IsNullOrWhiteSpace(req.Timezone) ? "UTC" : req.Timezone,
            Currency = currencyCode,
            CurrencySymbol = currencySymbol,
            LogoUrl = req.LogoUrl,
            CreatedAt = DateTime.UtcNow
        };

        // Seed holes if provided.
        if (req.Holes is { Count: > 0 })
        {
            tenant.Holes = req.Holes
                .Where(h => h.HoleNumber >= 1 && h.HoleNumber <= 18)
                .Select(h => new CourseHole
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    HoleNumber = h.HoleNumber,
                    Par = h.Par,
                    YardageWhite = h.YardageWhite
                })
                .ToList();
        }

        _db.Tenants.Add(tenant);

        // Link the creator as this course's admin.
        user.TenantId = tenant.Id;
        if (user.Role == AppRole.Golfer || user.Role == AppRole.Staff)
            user.Role = AppRole.CourseAdmin;
        await _userManager.UpdateAsync(user);

        await _db.SaveChangesAsync();

        // Issue a fresh 15-minute access token so the client immediately has the tenant_id claim.
        var jwtKey = _config["Jwt:Key"]!;
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey));
        var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("tenant_id", tenant.Id.ToString())
        };

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "ChipAndChill",
            audience: _config["Jwt:Audience"] ?? "ChipAndChillUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        // Also issue and attach HttpOnly refresh token cookie
        var refreshTokenStr = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenStr,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };
        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        Response.Cookies.Append("refreshToken", refreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Expires = refreshToken.ExpiresAt,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Secure = Request.IsHttps
        });

        return Ok(new AuthResponse(
            new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token),
            user.Email!, user.FirstName, user.LastName, user.Role, user.TenantId));
    }

    // POST /api/onboarding/logo — multipart image upload; stores under wwwroot/uploads.
    [HttpPost("logo")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB
    public async Task<ActionResult<object>> UploadLogo(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var allowed = new[] { ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest("Only png, jpg, jpeg, gif, webp or svg images are allowed.");

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid()}{ext}";
        await using var stream = System.IO.File.Create(Path.Combine(uploadsRoot, fileName));
        await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/{fileName}" });
    }
}

