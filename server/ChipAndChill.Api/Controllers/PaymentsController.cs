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
[Route("api/tenants/{tenantId:guid}")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPaymentService _paymentService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITenantNotificationService _notificationService;

    public PaymentsController(
        AppDbContext db,
        IPaymentService paymentService,
        UserManager<ApplicationUser> userManager,
        ITenantNotificationService notificationService)
    {
        _db = db;
        _paymentService = paymentService;
        _userManager = userManager;
        _notificationService = notificationService;
    }

    [HttpPost("stripe/connect-link")]
    [Authorize(Roles = "CourseAdmin,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<StripeConnectResponse>> GetConnectLink(Guid tenantId, [FromQuery] string? returnUrl, [FromQuery] string? refreshUrl)
    {
        var tenant = await _db.Tenants.FindAsync(tenantId);
        if (tenant == null) return NotFound("Tenant not found.");

        var ret = returnUrl ?? $"{Request.Scheme}://{Request.Host}/dashboard/payouts";
        var refUrl = refreshUrl ?? $"{Request.Scheme}://{Request.Host}/dashboard/payouts";

        var response = await _paymentService.CreateConnectAccountLinkAsync(tenant, ret, refUrl);
        return Ok(response);
    }

    [HttpGet("stripe/status")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<StripeStatusResponse>> GetStripeStatus(Guid tenantId)
    {
        var tenant = await _db.Tenants.FindAsync(tenantId);
        if (tenant == null) return NotFound("Tenant not found.");

        var status = await _paymentService.GetAccountStatusAsync(tenant);
        return Ok(status);
    }

    [HttpPost("bookings/{bookingId:guid}/checkout")]
    [Authorize]
    public async Task<ActionResult<CheckoutSessionResponse>> CreateCheckoutSession(Guid tenantId, Guid bookingId, CreateCheckoutRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var booking = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.TeeSlot)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);

        if (booking == null) return NotFound("Booking not found.");
        if (booking.UserId != userId && !User.IsInRole("CourseAdmin") && !User.IsInRole("SuperAdmin"))
            return Forbid();

        var tenant = await _db.Tenants.FindAsync(tenantId);
        if (tenant == null) return NotFound("Tenant not found.");

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return Unauthorized();

        var totalAmount = (booking.TeeSlot?.Price ?? 50.00m) * booking.PartySize;
        var successUrl = req.ReturnUrl ?? $"{Request.Scheme}://{Request.Host}/bookings?checkout=success&bookingId={booking.Id}";
        var cancelUrl = req.ReturnUrl ?? $"{Request.Scheme}://{Request.Host}/bookings?checkout=cancelled&bookingId={booking.Id}";

        var session = await _paymentService.CreateBookingCheckoutSessionAsync(
            booking,
            tenant,
            user,
            totalAmount,
            successUrl,
            cancelUrl);

        return Ok(session);
    }

    [HttpPost("bookings/{bookingId:guid}/confirm-sandbox-payment")]
    [Authorize]
    public async Task<ActionResult<PaymentConfirmationResponse>> ConfirmSandboxPayment(
        Guid tenantId,
        Guid bookingId,
        ConfirmSandboxPaymentRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var booking = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.TeeSlot)
            .Include(b => b.User)
            .Include(b => b.Tenant)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);

        if (booking == null) return NotFound("Booking not found.");
        if (booking.UserId != userId && !User.IsInRole("CourseAdmin") && !User.IsInRole("SuperAdmin"))
            return Forbid();

        var totalAmount = (booking.TeeSlot?.Price ?? 50.00m) * booking.PartySize;
        var confirmation = await _paymentService.ConfirmSandboxPaymentAsync(
            booking,
            totalAmount,
            req.CardHolderName,
            req.CardNumberLast4);

        // Send payment confirmation email via tenant mailer
        if (booking.User != null)
        {
            await _notificationService.SendPaymentReceiptAsync(tenantId, booking.User, booking, totalAmount, confirmation.TransactionId ?? string.Empty);
        }

        return Ok(confirmation);
    }

    [HttpPost("bookings/{bookingId:guid}/refund")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<RefundResponse>> RefundBooking(Guid tenantId, Guid bookingId)
    {
        var booking = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.TeeSlot)
            .Include(b => b.User)
            .Include(b => b.Tenant)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);

        if (booking == null) return NotFound("Booking not found.");
        if (booking.PaymentStatus != PaymentStatus.Paid)
            return BadRequest("Booking has not been paid or is already refunded.");

        var refundedAmount = booking.AmountPaid;
        var success = await _paymentService.ProcessRefundAsync(booking);
        if (!success) return BadRequest("Unable to process refund.");

        if (booking.User != null)
        {
            await _notificationService.SendRefundNoticeAsync(tenantId, booking.User, booking, refundedAmount);
        }

        return Ok(new RefundResponse(booking.Id, booking.PaymentStatus, refundedAmount));
    }
}
