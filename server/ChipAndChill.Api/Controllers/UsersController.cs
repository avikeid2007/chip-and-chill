using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public UsersController(UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    // GET /api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe()
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        // Calculate career stats
        var rounds = await _db.Rounds
            .IgnoreQueryFilters()
            .Where(r => r.UserId == user.Id)
            .Include(r => r.Holes)
            .ToListAsync();

        var totalRounds = rounds.Count;
        double? bestRoundScore = rounds.Count > 0 
            ? rounds.Min(r => r.Holes.Sum(h => h.Strokes))
            : null;

        var tournamentCount = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .CountAsync(t => t.UserId == user.Id || (user.Email != null && t.GolferEmail == user.Email));

        var rangeCount = await _db.BayBookings
            .IgnoreQueryFilters()
            .CountAsync(b => b.UserId == user.Id || (user.Email != null && b.GolferEmail == user.Email));

        var teeTimesCount = await _db.Bookings
            .IgnoreQueryFilters()
            .CountAsync(b => b.UserId == user.Id);

        var careerStats = new GolferCareerSummaryDto(
            totalRounds,
            bestRoundScore,
            tournamentCount,
            rangeCount,
            teeTimesCount
        );

        return Ok(ToResponse(user, careerStats));
    }

    // PUT /api/users/me
    [HttpPut("me")]
    public async Task<ActionResult<UserProfileResponse>> UpdateMe(UpdateProfileRequest req)
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        user.FirstName = req.FirstName.Trim();
        user.LastName = req.LastName.Trim();
        user.PhoneNumber = req.PhoneNumber;
        user.AvatarUrl = req.AvatarUrl;
        user.Bio = req.Bio;
        user.City = req.City;
        user.Country = req.Country;
        user.HomeClubName = req.HomeClubName;
        user.Handedness = req.Handedness ?? user.Handedness;
        user.PreferredTee = req.PreferredTee ?? user.PreferredTee;
        user.AverageScore = req.AverageScore ?? user.AverageScore;
        user.PlayFrequency = req.PlayFrequency ?? user.PlayFrequency;
        user.Driver = req.Driver;
        user.Irons = req.Irons;
        user.Putter = req.Putter;
        user.GolfBall = req.GolfBall;
        user.EmergencyContactName = req.EmergencyContactName;
        user.EmergencyContactPhone = req.EmergencyContactPhone;
        
        if (req.SmsAlertsEnabled.HasValue)
            user.SmsAlertsEnabled = req.SmsAlertsEnabled.Value;
        if (req.MarketingEnabled.HasValue)
            user.MarketingEnabled = req.MarketingEnabled.Value;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(ToResponse(user));
    }

    // POST /api/users/me/avatar
    [HttpPost("me/avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB
    public async Task<ActionResult<object>> UploadAvatar(IFormFile file)
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var allowed = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest("Only image files (.png, .jpg, .jpeg, .webp, .gif) are allowed.");

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{user.Id}_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var avatarUrl = $"/uploads/avatars/{fileName}";
        user.AvatarUrl = avatarUrl;
        await _userManager.UpdateAsync(user);

        return Ok(new { url = avatarUrl });
    }

    // PUT /api/users/me/password
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
    }

    private async Task<ApplicationUser?> CurrentUser()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim, out var id)) return null;
        return await _userManager.FindByIdAsync(id.ToString());
    }

    private static UserProfileResponse ToResponse(ApplicationUser u, GolferCareerSummaryDto? careerStats = null) =>
        new(
            u.Id,
            u.Email!,
            u.FirstName,
            u.LastName,
            u.PhoneNumber,
            u.Role,
            u.TenantId,
            u.HandicapIndex,
            u.CreatedAt,
            u.AvatarUrl,
            u.Bio,
            u.City,
            u.Country,
            u.HomeClubName,
            u.Handedness,
            u.PreferredTee,
            u.AverageScore,
            u.PlayFrequency,
            u.Driver,
            u.Irons,
            u.Putter,
            u.GolfBall,
            u.EmergencyContactName,
            u.EmergencyContactPhone,
            u.SmsAlertsEnabled,
            u.MarketingEnabled,
            careerStats
        );
}

