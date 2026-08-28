using Microsoft.AspNetCore.Authorization;
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
[Route("api/tenants/{tenantId:guid}")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantNotificationService _notificationService;
    private readonly IEmailSender _emailSender;
    private readonly IPricingEngine _pricingEngine;
    private readonly IPaymentService _paymentService;

    public BookingsController(
        AppDbContext db,
        ITenantNotificationService notificationService,
        IEmailSender emailSender,
        IPricingEngine pricingEngine,
        IPaymentService paymentService)
    {
        _db = db;
        _notificationService = notificationService;
        _emailSender = emailSender;
        _pricingEngine = pricingEngine;
        _paymentService = paymentService;
    }

    // GET /api/tenants/{tenantId}/tee-slots?date=2026-08-25[&includeBlocked=true]
    [HttpGet("tee-slots")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TeeSlotResponse>>> GetTeeSlots(Guid tenantId, [FromQuery] DateOnly date, [FromQuery] bool includeBlocked = false)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);

        var slots = await _db.TeeSlots
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && s.StartTime >= dayStart && s.StartTime < dayEnd
                        && (includeBlocked || !s.IsBlocked))
            .Include(s => s.Bookings)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        var response = slots.Select(s =>
        {
            var booked = s.Bookings.Where(b => b.Status != BookingStatus.Cancelled).Sum(b => b.PartySize);
            var status = s.IsBlocked ? "blocked" : booked >= s.MaxPlayers ? "full" : booked >= s.MaxPlayers - 1 ? "low" : "open";
            return new TeeSlotResponse(s.Id, s.StartTime, s.MaxPlayers, booked, s.Price, status);
        });

        return Ok(response);
    }

    // Admin creates available tee slots for a day.
    [HttpPost("tee-slots")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TeeSlot>> CreateTeeSlot(Guid tenantId, CreateTeeSlotRequest req)
    {
        var slotPrice = req.Price;
        if (slotPrice <= 0)
        {
            slotPrice = await _pricingEngine.CalculatePriceAsync(tenantId, req.StartTime, 50.00m);
        }

        var slot = new TeeSlot
        {
            TenantId = tenantId,
            StartTime = req.StartTime,
            MaxPlayers = req.MaxPlayers,
            Price = slotPrice
        };
        _db.TeeSlots.Add(slot);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTeeSlots), new { tenantId, date = DateOnly.FromDateTime(slot.StartTime) }, slot);
    }

    [HttpPost("bookings")]
    [Authorize]
    public async Task<ActionResult<BookingResponse>> CreateBooking(Guid tenantId, CreateBookingRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var slot = await _db.TeeSlots
            .IgnoreQueryFilters()
            .Include(s => s.Bookings)
            .FirstOrDefaultAsync(s => s.Id == req.TeeSlotId && s.TenantId == tenantId);

        if (slot == null) return NotFound("Tee slot not found.");

        var alreadyBooked = slot.Bookings.Where(b => b.Status != BookingStatus.Cancelled).Sum(b => b.PartySize);
        if (alreadyBooked + req.PartySize > slot.MaxPlayers)
            return BadRequest("Not enough open spots in this slot.");

        var booking = new Booking
        {
            TenantId = tenantId,
            TeeSlotId = req.TeeSlotId,
            UserId = userId,
            PartySize = req.PartySize,
            Status = BookingStatus.Confirmed,
            PaymentStatus = PaymentStatus.Unpaid,
            AmountPaid = 0
        };
        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        var totalPrice = slot.Price * req.PartySize;

        // Booking confirmation email & SMS via per-course settings
        var booker = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        await _notificationService.SendBookingConfirmationAsync(tenantId, booking, booker, slot);

        return Created($"/api/tenants/{tenantId}/bookings/{booking.Id}",
            new BookingResponse(
                booking.Id,
                booking.TeeSlotId,
                booking.PartySize,
                booking.Status.ToString(),
                booking.PaymentStatus.ToString(),
                booking.AmountPaid,
                totalPrice));
    }

    [HttpGet("bookings/mine")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<MyBookingResponse>>> GetMyBookings(Guid tenantId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId && b.UserId == userId)
            .Include(b => b.TeeSlot)
            .OrderByDescending(b => b.TeeSlot!.StartTime)
            .ToListAsync();

        return Ok(bookings.Select(b => new MyBookingResponse(
            b.Id,
            b.TeeSlotId,
            b.PartySize,
            b.Status.ToString(),
            b.TeeSlot?.StartTime ?? DateTime.MinValue,
            b.TeeSlot?.Price ?? 0,
            b.PaymentStatus.ToString(),
            b.AmountPaid)));
    }

    [HttpPost("bookings/{bookingId:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelBooking(Guid tenantId, Guid bookingId)
    {
        var booking = await _db.Bookings.IgnoreQueryFilters()
            .Include(b => b.User)
            .Include(b => b.TeeSlot)
            .Include(b => b.Tenant)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
        if (booking == null) return NotFound();

        var wasPaid = booking.PaymentStatus == PaymentStatus.Paid;
        var paidAmount = booking.AmountPaid;

        booking.Status = BookingStatus.Cancelled;

        if (wasPaid)
        {
            await _paymentService.ProcessRefundAsync(booking);
        }

        await _db.SaveChangesAsync();

        if (booking.User != null)
        {
            await _notificationService.SendBookingCancellationAsync(tenantId, booking, booking.User, wasPaid ? paidAmount : 0);
        }

        // Waitlist auto-notify: email the earliest active waitlist entry for this slot.
        var nextInLine = await _db.WaitlistEntries
            .IgnoreQueryFilters()
            .Where(w => w.TeeSlotId == booking.TeeSlotId && !w.Notified)
            .OrderBy(w => w.JoinedAt)
            .Include(w => w.User)
            .Include(w => w.TeeSlot)
            .FirstOrDefaultAsync();

        if (nextInLine?.User?.Email != null && nextInLine.TeeSlot != null)
        {
            await _emailSender.SendAsync(new EmailMessage(
                nextInLine.User.Email,
                $"A tee time opened up — {nextInLine.TeeSlot.StartTime:MMM d, h:mm tt}",
                $"Hi {nextInLine.User.FirstName},\n\n" +
                $"Good news! A spot just opened for the {nextInLine.TeeSlot.StartTime:f} (UTC) tee time.\n" +
                $"You were first on the waitlist — book it before someone else does!\n\n" +
                "— Chip & Chill"));
            nextInLine.Notified = true;
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }


    // ---- Waitlist ----

    // POST /api/tenants/{tenantId}/tee-slots/{slotId}/waitlist — join the waitlist.
    [HttpPost("tee-slots/{slotId:guid}/waitlist")]
    [Authorize]
    public async Task<ActionResult<WaitlistResponse>> JoinWaitlist(Guid tenantId, Guid slotId, JoinWaitlistRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var slot = await _db.TeeSlots.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == slotId && s.TenantId == tenantId);
        if (slot == null) return NotFound("Tee slot not found.");

        // Only allow joining when the slot is actually full.
        var existingBookings = await _db.Bookings.IgnoreQueryFilters()
            .Where(b => b.TeeSlotId == slotId && b.Status != BookingStatus.Cancelled)
            .SumAsync(b => (int?)b.PartySize) ?? 0;
        if (existingBookings < slot.MaxPlayers)
            return BadRequest("This slot still has open spots — book directly instead.");

        // One active waitlist entry per user per slot.
        var alreadyWaiting = await _db.WaitlistEntries.IgnoreQueryFilters()
            .AnyAsync(w => w.TeeSlotId == slotId && w.UserId == userId && !w.Notified);
        if (alreadyWaiting)
            return Conflict("You're already on the waitlist for this slot.");

        var entry = new WaitlistEntry
        {
            TenantId = tenantId,
            TeeSlotId = slotId,
            UserId = userId,
            PartySize = Math.Max(1, req.PartySize),
            JoinedAt = DateTime.UtcNow
        };
        _db.WaitlistEntries.Add(entry);
        await _db.SaveChangesAsync();

        var position = await _db.WaitlistEntries.IgnoreQueryFilters()
            .CountAsync(w => w.TeeSlotId == slotId && !w.Notified && w.JoinedAt < entry.JoinedAt) + 1;

        return Ok(new WaitlistResponse(entry.Id, position));
    }

    // GET /api/tenants/{tenantId}/tee-slots/{slotId}/waitlist — my entries for a slot.
    [HttpGet("tee-slots/{slotId:guid}/waitlist/mine")]
    [Authorize]
    public async Task<ActionResult<object>> MyWaitlistStatus(Guid tenantId, Guid slotId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var entries = await _db.WaitlistEntries.IgnoreQueryFilters()
            .Where(w => w.TeeSlotId == slotId && w.UserId == userId)
            .OrderBy(w => w.JoinedAt)
            .ToListAsync();

        return Ok(entries.Select(w => new { w.Id, w.PartySize, w.Notified, w.JoinedAt }));
    }

    // DELETE /api/tenants/{tenantId}/tee-slots/{slotId}/waitlist/{entryId} — leave the waitlist.
    [HttpDelete("tee-slots/{slotId:guid}/waitlist/{entryId:guid}")]
    [Authorize]
    public async Task<IActionResult> LeaveWaitlist(Guid tenantId, Guid slotId, Guid entryId)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var entry = await _db.WaitlistEntries.IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == entryId && w.TeeSlotId == slotId && w.UserId == userId);
        if (entry == null) return NotFound();

        _db.WaitlistEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Admin endpoints (Course Admin / Staff) ----

    // GET /api/tenants/{tenantId}/bookings — tenant-wide list for admins.
    [HttpGet("bookings/all")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<AdminBookingResponse>>> GetAllBookings(Guid tenantId, [FromQuery] DateOnly? date)
    {
        var query = _db.Bookings
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .Include(b => b.TeeSlot)
            .Include(b => b.User)
            .AsQueryable();

        if (date.HasValue)
        {
            var dayStart = date.Value.ToDateTime(TimeOnly.MinValue);
            var dayEnd = dayStart.AddDays(1);
            query = query.Where(b => b.TeeSlot!.StartTime >= dayStart && b.TeeSlot!.StartTime < dayEnd);
        }

        var bookings = await query
            .OrderByDescending(b => b.TeeSlot!.StartTime)
            .ToListAsync();

        return Ok(bookings.Select(b => new AdminBookingResponse(
            b.Id,
            b.TeeSlotId,
            b.TeeSlot?.StartTime ?? DateTime.MinValue,
            b.User?.Email ?? "unknown",
            $"{b.User?.FirstName} {b.User?.LastName}".Trim(),
            b.PartySize,
            b.Status,
            b.TeeSlot?.Price ?? 0,
            b.PaymentStatus,
            b.AmountPaid)));
    }

    // POST /api/tenants/{tenantId}/bookings/{bookingId}/check-in
    [HttpPost("bookings/{bookingId:guid}/check-in")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<CheckInResponse>> CheckIn(Guid tenantId, Guid bookingId)
    {
        var booking = await _db.Bookings.IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
        if (booking == null) return NotFound();

        booking.Status = BookingStatus.CheckedIn;
        await _db.SaveChangesAsync();
        return Ok(new CheckInResponse(booking.Id, booking.Status));
    }

    // PATCH /api/tenants/{tenantId}/tee-slots/{slotId} — block/unblock a slot.
    [HttpPatch("tee-slots/{slotId:guid}")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> UpdateTeeSlot(Guid tenantId, Guid slotId, UpdateTeeSlotRequest req)
    {
        var slot = await _db.TeeSlots.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == slotId && s.TenantId == tenantId);
        if (slot == null) return NotFound();

        slot.IsBlocked = req.IsBlocked;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/tenants/{tenantId}/dashboard-summary — aggregate stats for admin home.
    [HttpGet("dashboard-summary")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<DashboardSummaryResponse>> GetDashboardSummary(Guid tenantId)
    {
        var today = DateTime.UtcNow.Date;
        var weekEnd = today.AddDays(7);

        var slotsToday = await _db.TeeSlots
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && s.StartTime >= today && s.StartTime < today.AddDays(1))
            .Include(s => s.Bookings)
            .ToListAsync();

        var bookingsToday = slotsToday.SelectMany(s => s.Bookings).Count(b => b.Status != BookingStatus.Cancelled);

        var bookingsThisWeek = await _db.Bookings
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId && b.Status != BookingStatus.Cancelled
                        && b.TeeSlot!.StartTime >= today && b.TeeSlot!.StartTime < weekEnd)
            .CountAsync();

        var upcomingBookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId && b.Status != BookingStatus.Cancelled && b.TeeSlot!.StartTime >= DateTime.UtcNow)
            .CountAsync();

        var totalRounds = await _db.Rounds
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId)
            .CountAsync();

        var activeSlotsToday = slotsToday.Count(s => !s.IsBlocked);
        var capacity = slotsToday.Where(s => !s.IsBlocked).Sum(s => s.MaxPlayers);
        var booked = slotsToday.Where(s => !s.IsBlocked)
            .SelectMany(s => s.Bookings)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .Sum(b => b.PartySize);
        var occupancy = capacity > 0 ? Math.Round(100.0 * booked / capacity, 1) : 0;

        return Ok(new DashboardSummaryResponse(bookingsToday, bookingsThisWeek, upcomingBookings, totalRounds, occupancy, activeSlotsToday));
    }
}

