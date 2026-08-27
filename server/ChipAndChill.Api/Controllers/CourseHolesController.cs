using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}/holes")]
public class CourseHolesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CourseHolesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<CourseHole>>> GetAll(Guid tenantId)
    {
        var holes = await _db.CourseHoles
            .IgnoreQueryFilters() // public read across tenant, filtered manually below
            .Where(h => h.TenantId == tenantId)
            .OrderBy(h => h.HoleNumber)
            .ToListAsync();
        return Ok(holes);
    }

    [HttpPut]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> Upsert(Guid tenantId, List<CourseHole> holes)
    {
        var existing = await _db.CourseHoles.IgnoreQueryFilters().Where(h => h.TenantId == tenantId).ToListAsync();
        _db.CourseHoles.RemoveRange(existing);

        foreach (var h in holes)
        {
            h.Id = Guid.NewGuid();
            h.TenantId = tenantId;
        }
        await _db.CourseHoles.AddRangeAsync(holes);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

