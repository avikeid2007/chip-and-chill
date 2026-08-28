using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(UserManager<ApplicationUser> userManager, AppDbContext db, IConfiguration config)
    {
        _userManager = userManager;
        _db = db;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Role = req.Role,
            TenantId = req.TenantId
        };

        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        // Generate 15-minute access token and 30-day HttpOnly refresh token
        var accessToken = GenerateAccessToken(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);
        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);

        return Ok(new AuthResponse(accessToken, user.Email, user.FirstName, user.LastName, user.Role, user.TenantId));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Invalid email or password.");

        var accessToken = GenerateAccessToken(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);
        SetRefreshTokenCookie(refreshToken.Token, refreshToken.ExpiresAt);

        return Ok(new AuthResponse(accessToken, user.Email!, user.FirstName, user.LastName, user.Role, user.TenantId));
    }

    // POST /api/auth/refresh — reads HttpOnly refresh token cookie, rotates it, and returns a new 15-minute access token
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var cookieToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(cookieToken))
            return Unauthorized("Refresh token cookie is missing.");

        var refreshToken = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == cookieToken);

        if (refreshToken == null || !refreshToken.IsActive || refreshToken.User == null)
        {
            ClearRefreshTokenCookie();
            return Unauthorized("Invalid or expired refresh token.");
        }

        // Refresh Token Rotation: Revoke old token and issue a fresh one
        refreshToken.RevokedAt = DateTime.UtcNow;
        refreshToken.RevokedByIp = GetIpAddress();

        var newRefreshToken = new RefreshToken
        {
            UserId = refreshToken.UserId,
            Token = GenerateRandomTokenString(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = GetIpAddress()
        };

        refreshToken.ReplacedByToken = newRefreshToken.Token;

        _db.RefreshTokens.Add(newRefreshToken);
        await _db.SaveChangesAsync();

        SetRefreshTokenCookie(newRefreshToken.Token, newRefreshToken.ExpiresAt);

        var newAccessToken = GenerateAccessToken(refreshToken.User);
        return Ok(new AuthResponse(newAccessToken, refreshToken.User.Email!, refreshToken.User.FirstName, refreshToken.User.LastName, refreshToken.User.Role, refreshToken.User.TenantId));
    }

    // POST /api/auth/logout — revokes refresh token in database and deletes the HttpOnly cookie
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        var cookieToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrWhiteSpace(cookieToken))
        {
            var refreshToken = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == cookieToken);
            if (refreshToken != null && refreshToken.IsActive)
            {
                refreshToken.RevokedAt = DateTime.UtcNow;
                refreshToken.RevokedByIp = GetIpAddress();
                await _db.SaveChangesAsync();
            }
        }

        ClearRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully." });
    }

    // GET /api/auth/me — returns current authenticated user profile
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<object>> GetCurrentUser()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return NotFound("User not found.");

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            role = user.Role.ToString(),
            tenantId = user.TenantId,
            handicapIndex = user.HandicapIndex
        });
    }

    // POST /api/auth/forgot-password
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user == null)
            return Ok(new { message = "If the account exists, a reset token has been issued." });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        return Ok(new { message = "Reset token generated.", token });
    }

    // POST /api/auth/reset-password
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user == null)
            return BadRequest("Invalid request.");

        var result = await _userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { message = "Password reset successfully." });
    }

    // ── Helper Methods ────────────────────────────────────────────────────────

    private string GenerateAccessToken(ApplicationUser user)
    {
        var jwtKey = _config["Jwt:Key"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Role, user.Role.ToString())
        };
        if (user.TenantId.HasValue)
            claims.Add(new Claim("tenant_id", user.TenantId.Value.ToString()));

        // Short-lived access token: 15 minutes
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "ChipAndChill",
            audience: _config["Jwt:Audience"] ?? "ChipAndChillUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> CreateRefreshTokenAsync(Guid userId)
    {
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = GenerateRandomTokenString(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = GetIpAddress()
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();
        return refreshToken;
    }

    private static string GenerateRandomTokenString()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    private void SetRefreshTokenCookie(string token, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = expiresAt,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Secure = Request.IsHttps
        };

        Response.Cookies.Append("refreshToken", token, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Secure = Request.IsHttps
        });
    }

    private string? GetIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
            return forwardedFor.FirstOrDefault();
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
