using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using ChipAndChill.Api.Services;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}/range")]
public class RangeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITenantNotificationService _notificationService;

    public RangeController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ITenantNotificationService notificationService)
    {
        _db = db;
        _userManager = userManager;
        _notificationService = notificationService;
    }

    // GET /api/tenants/{tenantId}/range/bays
    [HttpGet("bays")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RangeBayDto>>> GetBays(Guid tenantId)
    {
        var bays = await _db.RangeBays
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .OrderBy(b => b.BayNumber)
            .ToListAsync();

        return Ok(bays.Select(b => new RangeBayDto(
            b.Id,
            b.TenantId,
            b.BayNumber,
            b.Name,
            b.IsOutdoor,
            b.HasLaunchMonitor,
            b.HourlyRate,
            b.IsActive,
            b.CreatedAt
        )));
    }

    // POST /api/tenants/{tenantId}/range/bays
    [HttpPost("bays")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<RangeBayDto>> CreateBay(Guid tenantId, CreateRangeBayRequest req)
    {
        var bay = new RangeBay
        {
            TenantId = tenantId,
            BayNumber = req.BayNumber,
            Name = req.Name.Trim(),
            IsOutdoor = req.IsOutdoor,
            HasLaunchMonitor = req.HasLaunchMonitor,
            HourlyRate = req.HourlyRate > 0 ? req.HourlyRate : 300m,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.RangeBays.Add(bay);
        await _db.SaveChangesAsync();

        return Ok(new RangeBayDto(
            bay.Id,
            bay.TenantId,
            bay.BayNumber,
            bay.Name,
            bay.IsOutdoor,
            bay.HasLaunchMonitor,
            bay.HourlyRate,
            bay.IsActive,
            bay.CreatedAt
        ));
    }

    // PUT /api/tenants/{tenantId}/range/bays/{id}
    [HttpPut("bays/{id:guid}")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<RangeBayDto>> UpdateBay(Guid tenantId, Guid id, UpdateRangeBayRequest req)
    {
        var bay = await _db.RangeBays
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == id);

        if (bay == null) return NotFound("Bay not found.");

        if (req.BayNumber.HasValue) bay.BayNumber = req.BayNumber.Value;
        if (req.Name != null) bay.Name = req.Name.Trim();
        if (req.IsOutdoor.HasValue) bay.IsOutdoor = req.IsOutdoor.Value;
        if (req.HasLaunchMonitor.HasValue) bay.HasLaunchMonitor = req.HasLaunchMonitor.Value;
        if (req.HourlyRate.HasValue) bay.HourlyRate = req.HourlyRate.Value;
        if (req.IsActive.HasValue) bay.IsActive = req.IsActive.Value;

        await _db.SaveChangesAsync();

        return Ok(new RangeBayDto(
            bay.Id,
            bay.TenantId,
            bay.BayNumber,
            bay.Name,
            bay.IsOutdoor,
            bay.HasLaunchMonitor,
            bay.HourlyRate,
            bay.IsActive,
            bay.CreatedAt
        ));
    }

    // DELETE /api/tenants/{tenantId}/range/bays/{id}
    [HttpDelete("bays/{id:guid}")]
    [Authorize(Roles = "CourseAdmin,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> DeleteBay(Guid tenantId, Guid id)
    {
        var bay = await _db.RangeBays
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == id);

        if (bay == null) return NotFound();

        _db.RangeBays.Remove(bay);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/tenants/{tenantId}/range/availability?date=2026-08-27&durationMinutes=60
    [HttpGet("availability")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RangeAvailabilitySlotDto>>> GetAvailability(
        Guid tenantId,
        [FromQuery] DateOnly date,
        [FromQuery] int durationMinutes = 60)
    {
        var duration = durationMinutes switch
        {
            30 => 30,
            60 => 60,
            90 => 90,
            120 => 120,
            _ => 60
        };

        var dayStart = date.ToDateTime(new TimeOnly(8, 0));  // 8:00 AM
        var dayEnd = date.ToDateTime(new TimeOnly(21, 0));   // 9:00 PM

        var activeBays = await _db.RangeBays
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId && b.IsActive)
            .OrderBy(b => b.BayNumber)
            .ToListAsync();

        var bookings = await _db.BayBookings
            .IgnoreQueryFilters()
            .Where(bk => bk.TenantId == tenantId
                         && bk.Status != BayBookingStatus.Cancelled
                         && bk.StartTime >= date.ToDateTime(TimeOnly.MinValue)
                         && bk.StartTime < date.AddDays(1).ToDateTime(TimeOnly.MinValue))
            .ToListAsync();

        var results = new List<RangeAvailabilitySlotDto>();

        foreach (var bay in activeBays)
        {
            var current = dayStart;
            while (current.AddMinutes(duration) <= dayEnd)
            {
                var slotEnd = current.AddMinutes(duration);

                // Overlap check
                var isOccupied = bookings.Any(b =>
                    b.RangeBayId == bay.Id &&
                    b.StartTime < slotEnd &&
                    b.EndTime > current);

                var slotPrice = Math.Round((bay.HourlyRate * duration) / 60m, 2);

                results.Add(new RangeAvailabilitySlotDto(
                    bay.Id,
                    bay.BayNumber,
                    bay.Name,
                    bay.HasLaunchMonitor,
                    bay.IsOutdoor,
                    slotPrice,
                    current,
                    slotEnd,
                    !isOccupied
                ));

                current = current.AddMinutes(30); // 30-min stepping
            }
        }

        return Ok(results);
    }

    // POST /api/tenants/{tenantId}/range/bookings
    [HttpPost("bookings")]
    [AllowAnonymous]
    public async Task<ActionResult<BayBookingDto>> CreateBooking(Guid tenantId, CreateBayBookingRequest req)
    {
        var bay = await _db.RangeBays
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == req.RangeBayId && b.IsActive);

        if (bay == null) return NotFound("Range bay not found.");

        var duration = req.DurationMinutes switch
        {
            30 => 30,
            60 => 60,
            90 => 90,
            120 => 120,
            _ => 60
        };

        if (req.StartTime < DateTime.UtcNow.AddMinutes(-5))
            return BadRequest("Cannot book a range bay for a past time window.");

        var endTime = req.StartTime.AddMinutes(duration);

        // Check conflicts
        var hasConflict = await _db.BayBookings
            .IgnoreQueryFilters()
            .AnyAsync(bk => bk.TenantId == tenantId &&
                            bk.RangeBayId == req.RangeBayId &&
                            bk.Status != BayBookingStatus.Cancelled &&
                            bk.StartTime < endTime &&
                            bk.EndTime > req.StartTime);

        if (hasConflict)
            return Conflict("This bay has already been booked for that time window.");

        Guid? userId = null;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
        {
            userId = parsedId;
        }

        var price = Math.Round((bay.HourlyRate * duration) / 60m, 2);

        var booking = new BayBooking
        {
            TenantId = tenantId,
            RangeBayId = bay.Id,
            UserId = userId,
            GolferName = req.GolferName.Trim(),
            GolferEmail = req.GolferEmail.Trim().ToLowerInvariant(),
            StartTime = req.StartTime,
            EndTime = endTime,
            DurationMinutes = duration,
            Status = BayBookingStatus.Confirmed,
            Price = price,
            PaymentStatus = BayPaymentStatus.Unpaid,
            AmountPaid = 0m,
            CreatedAt = DateTime.UtcNow
        };

        _db.BayBookings.Add(booking);
        await _db.SaveChangesAsync();

        await _notificationService.SendBayBookingConfirmationAsync(tenantId, booking, null, bay);

        return Ok(new BayBookingDto(
            booking.Id,
            booking.TenantId,
            booking.RangeBayId,
            bay.Name,
            bay.BayNumber,
            booking.UserId,
            booking.GolferName,
            booking.GolferEmail,
            booking.StartTime,
            booking.EndTime,
            booking.DurationMinutes,
            booking.Status,
            booking.Price,
            booking.PaymentStatus,
            booking.AmountPaid,
            booking.CreatedAt
        ));
    }

    // POST /api/tenants/{tenantId}/range/bookings/{id}/confirm-sandbox-payment
    [HttpPost("bookings/{id:guid}/confirm-sandbox-payment")]
    [AllowAnonymous]
    public async Task<ActionResult<BayBookingDto>> ConfirmSandboxPayment(
        Guid tenantId,
        Guid id,
        [FromQuery] string? email = null)
    {
        var booking = await _db.BayBookings
            .IgnoreQueryFilters()
            .Include(bk => bk.RangeBay)
            .FirstOrDefaultAsync(bk => bk.TenantId == tenantId && bk.Id == id);

        if (booking == null) return NotFound("Bay booking not found.");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = null;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
            userId = parsedId;

        ApplicationUser? user = null;
        if (userId.HasValue)
        {
            user = await _userManager.FindByIdAsync(userId.Value.ToString());
        }

        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = (booking.UserId.HasValue && booking.UserId == userId) || 
                      (!booking.UserId.HasValue && (
                          (user != null && string.Equals(user.Email, booking.GolferEmail, StringComparison.OrdinalIgnoreCase)) ||
                          (!string.IsNullOrWhiteSpace(email) && string.Equals(email, booking.GolferEmail, StringComparison.OrdinalIgnoreCase)) ||
                          (booking.CreatedAt >= DateTime.UtcNow.AddMinutes(-10))
                      ));

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        booking.PaymentStatus = BayPaymentStatus.Paid;
        booking.AmountPaid = booking.Price;
        booking.PaymentIntentId = $"sandbox_bay_{Guid.NewGuid():N}";

        await _db.SaveChangesAsync();

        if (booking.RangeBay != null)
        {
            await _notificationService.SendBayBookingConfirmationAsync(tenantId, booking, user, booking.RangeBay);
        }

        return Ok(new BayBookingDto(
            booking.Id,
            booking.TenantId,
            booking.RangeBayId,
            booking.RangeBay?.Name ?? "Bay",
            booking.RangeBay?.BayNumber ?? 1,
            booking.UserId,
            booking.GolferName,
            booking.GolferEmail,
            booking.StartTime,
            booking.EndTime,
            booking.DurationMinutes,
            booking.Status,
            booking.Price,
            booking.PaymentStatus,
            booking.AmountPaid,
            booking.CreatedAt
        ));
    }

    // GET /api/tenants/{tenantId}/range/bookings
    [HttpGet("bookings")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<BayBookingDto>>> GetAllBookings(Guid tenantId, [FromQuery] DateOnly? date)
    {
        var query = _db.BayBookings
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .Include(b => b.RangeBay)
            .AsQueryable();

        if (date.HasValue)
        {
            var dayStart = date.Value.ToDateTime(TimeOnly.MinValue);
            var dayEnd = dayStart.AddDays(1);
            query = query.Where(b => b.StartTime >= dayStart && b.StartTime < dayEnd);
        }

        var list = await query
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();

        return Ok(list.Select(b => new BayBookingDto(
            b.Id,
            b.TenantId,
            b.RangeBayId,
            b.RangeBay?.Name ?? $"Bay {b.RangeBay?.BayNumber}",
            b.RangeBay?.BayNumber ?? 0,
            b.UserId,
            b.GolferName,
            b.GolferEmail,
            b.StartTime,
            b.EndTime,
            b.DurationMinutes,
            b.Status,
            b.Price,
            b.PaymentStatus,
            b.AmountPaid,
            b.CreatedAt
        )));
    }

    // POST /api/tenants/{tenantId}/range/bookings/{id}/check-in
    [HttpPost("bookings/{id:guid}/check-in")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> CheckIn(Guid tenantId, Guid id)
    {
        var booking = await _db.BayBookings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == id);

        if (booking == null) return NotFound();

        booking.Status = BayBookingStatus.Active;
        await _db.SaveChangesAsync();
        return Ok();
    }

    // POST /api/tenants/{tenantId}/range/bookings/{id}/cancel
    [HttpPost("bookings/{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelBooking(Guid tenantId, Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var booking = await _db.BayBookings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == id);

        if (booking == null) return NotFound();

        var user = await _userManager.FindByIdAsync(userId.ToString());
        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = (booking.UserId.HasValue && booking.UserId == userId) || 
                      (!booking.UserId.HasValue && user != null && string.Equals(user.Email, booking.GolferEmail, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        booking.Status = BayBookingStatus.Cancelled;
        if (booking.PaymentStatus == BayPaymentStatus.Paid)
        {
            booking.PaymentStatus = BayPaymentStatus.Refunded;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // GET /api/tenants/{tenantId}/range/live-status
    [HttpGet("live-status")]
    [AllowAnonymous]
    public async Task<ActionResult<RangeLiveStatusDto>> GetLiveStatus(Guid tenantId)
    {
        var now = DateTime.UtcNow;

        var bays = await _db.RangeBays
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .Include(b => b.Bookings)
            .OrderBy(b => b.BayNumber)
            .ToListAsync();

        var items = new List<BayLiveStatusItemDto>();

        var occupiedCount = 0;
        var availableCount = 0;
        var maintenanceCount = 0;

        foreach (var bay in bays)
        {
            if (!bay.IsActive)
            {
                maintenanceCount++;
                items.Add(new BayLiveStatusItemDto(
                    bay.Id,
                    bay.BayNumber,
                    bay.Name,
                    bay.HasLaunchMonitor,
                    bay.IsOutdoor,
                    bay.IsActive,
                    "Maintenance",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                ));
                continue;
            }

            // Find current active booking
            var current = bay.Bookings.FirstOrDefault(b =>
                (b.Status == BayBookingStatus.Active || b.Status == BayBookingStatus.Confirmed) &&
                b.StartTime <= now &&
                b.EndTime > now);

            if (current != null)
            {
                occupiedCount++;
                var remaining = (int)Math.Max(0, (current.EndTime - now).TotalMinutes);
                items.Add(new BayLiveStatusItemDto(
                    bay.Id,
                    bay.BayNumber,
                    bay.Name,
                    bay.HasLaunchMonitor,
                    bay.IsOutdoor,
                    bay.IsActive,
                    "Occupied",
                    current.Id,
                    current.GolferName,
                    current.StartTime,
                    current.EndTime,
                    remaining,
                    current.DurationMinutes
                ));
            }
            else
            {
                availableCount++;
                items.Add(new BayLiveStatusItemDto(
                    bay.Id,
                    bay.BayNumber,
                    bay.Name,
                    bay.HasLaunchMonitor,
                    bay.IsOutdoor,
                    bay.IsActive,
                    "Available",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                ));
            }
        }

        return Ok(new RangeLiveStatusDto(
            bays.Count,
            occupiedCount,
            availableCount,
            maintenanceCount,
            items
        ));
    }
}
