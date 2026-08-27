using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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

    public UsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe()
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        return Ok(ToResponse(user));
    }

    // PUT /api/users/me
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest req)
    {
        var user = await CurrentUser();
        if (user == null) return Unauthorized();

        user.FirstName = req.FirstName;
        user.LastName = req.LastName;
        if (req.PhoneNumber != null)
            user.PhoneNumber = req.PhoneNumber;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
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

    private static UserProfileResponse ToResponse(ApplicationUser u) =>
        new(u.Id, u.Email!, u.FirstName, u.LastName, u.PhoneNumber, u.Role, u.TenantId, u.HandicapIndex);
}

