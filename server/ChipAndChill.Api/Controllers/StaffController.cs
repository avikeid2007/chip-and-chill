using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}/staff")]
[Authorize(Roles = "CourseAdmin,SuperAdmin")]
[TenantScoped]
public class StaffController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public StaffController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/tenants/{tenantId}/staff
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaffMemberResponse>>> List(Guid tenantId)
    {
        var staff = await _userManager.Users
            .Where(u => u.TenantId == tenantId && (u.Role == AppRole.Staff || u.Role == AppRole.CourseAdmin))
            .OrderBy(u => u.Role) // Owners first (CourseAdmin=1 < Staff=2), then Staff
            .ThenBy(u => u.LastName)
            .ToListAsync();

        var response = staff.Select(u =>
            new StaffMemberResponse(u.Id, u.Email!, u.FirstName, u.LastName, u.LockoutEnd == null, u.Role.ToString()));

        return Ok(response);
    }

    // POST /api/tenants/{tenantId}/staff — invite (create) a staff account.
    // MVP: admin sets the initial password directly; email-invite flow comes later.
    [HttpPost]
    public async Task<ActionResult<StaffMemberResponse>> Invite(Guid tenantId, InviteStaffRequest req)
    {
        if (await _userManager.FindByEmailAsync(req.Email) != null)
            return Conflict("A user with this email already exists.");

        var staff = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Role = AppRole.Staff,
            TenantId = tenantId
        };

        var result = await _userManager.CreateAsync(staff, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Created($"/api/tenants/{tenantId}/staff",
            new StaffMemberResponse(staff.Id, staff.Email!, staff.FirstName, staff.LastName, true, AppRole.Staff.ToString()));
    }

    // DELETE /api/tenants/{tenantId}/staff/{userId} — removes the staff account.
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid tenantId, Guid userId)
    {
        var staff = await _userManager.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId);

        if (staff == null) return NotFound();
        if (staff.Role == AppRole.CourseAdmin)
            return BadRequest("Cannot remove a Course Admin via staff management.");

        await _userManager.DeleteAsync(staff);
        return NoContent();
    }

    private Guid? CurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}

