using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public class StripePaymentService : IPaymentService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<StripePaymentService> _logger;

    public StripePaymentService(AppDbContext db, IConfiguration config, ILogger<StripePaymentService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<StripeConnectResponse> CreateConnectAccountLinkAsync(Tenant tenant, string returnUrl, string refreshUrl)
    {
        var stripeSecret = _config["Stripe:SecretKey"];

        // If no real Stripe secret configured, simulate sandbox Connect onboarding
        if (string.IsNullOrWhiteSpace(stripeSecret) || stripeSecret.StartsWith("pk_test_placeholder") || stripeSecret.StartsWith("sk_test_placeholder"))
        {
            var simulatedAccountId = tenant.StripeAccountId ?? $"acct_sandbox_{tenant.Id.ToString("N")[..10]}";
            tenant.StripeAccountId = simulatedAccountId;
            tenant.StripePayoutsEnabled = true;
            tenant.StripeChargesEnabled = true;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Sandbox Stripe Connect activated for tenant {TenantId} (Account: {AccountId})", tenant.Id, simulatedAccountId);

            // Redirect back to returnUrl with success query
            var simulatedUrl = returnUrl.Contains("?") 
                ? $"{returnUrl}&stripe_connect=success" 
                : $"{returnUrl}?stripe_connect=success";

            return new StripeConnectResponse(simulatedUrl, simulatedAccountId);
        }

        // Live Stripe Connect integration would invoke Stripe.AccountService and Stripe.AccountLinkService here
        var accountId = tenant.StripeAccountId ?? $"acct_mock_{tenant.Id.ToString("N")[..10]}";
        tenant.StripeAccountId = accountId;
        tenant.StripePayoutsEnabled = true;
        tenant.StripeChargesEnabled = true;
        await _db.SaveChangesAsync();

        return new StripeConnectResponse(returnUrl, accountId);
    }

    public Task<StripeStatusResponse> GetAccountStatusAsync(Tenant tenant)
    {
        var isConnected = !string.IsNullOrWhiteSpace(tenant.StripeAccountId);
        return Task.FromResult(new StripeStatusResponse(
            isConnected,
            tenant.StripeAccountId,
            tenant.StripePayoutsEnabled,
            tenant.StripeChargesEnabled,
            tenant.RequirePaymentUpfront));
    }

    public Task<CheckoutSessionResponse> CreateBookingCheckoutSessionAsync(
        Booking booking,
        Tenant tenant,
        ApplicationUser user,
        decimal amount,
        string successUrl,
        string cancelUrl)
    {
        var currency = tenant.Currency?.ToLowerInvariant() ?? "inr";
        var stripeSecret = _config["Stripe:SecretKey"];

        // Sandbox Mode
        if (string.IsNullOrWhiteSpace(stripeSecret) || stripeSecret.StartsWith("sk_test_placeholder"))
        {
            var sessionId = $"cs_sandbox_{booking.Id:N}";
            return Task.FromResult(new CheckoutSessionResponse(
                sessionId,
                null,
                "Sandbox",
                amount,
                currency));
        }

        // Real Stripe checkout session url placeholder
        var realSessionId = $"cs_live_{booking.Id:N}";
        return Task.FromResult(new CheckoutSessionResponse(
            realSessionId,
            successUrl,
            "Stripe",
            amount,
            currency));
    }

    public async Task<PaymentConfirmationResponse> ConfirmSandboxPaymentAsync(Booking booking, decimal amount, string? cardHolder, string? cardLast4)
    {
        var txId = $"pi_sandbox_{Guid.NewGuid():N}";
        booking.PaymentStatus = PaymentStatus.Paid;
        booking.AmountPaid = amount;
        booking.PaymentIntentId = txId;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Payment confirmed for Booking {BookingId}: ${Amount} (Tx: {TxId}, Card: ****{CardLast4})",
            booking.Id, amount, txId, cardLast4 ?? "4242");

        return new PaymentConfirmationResponse(booking.Id, booking.PaymentStatus, amount, txId);
    }

    public async Task<bool> ProcessRefundAsync(Booking booking)
    {
        if (booking.PaymentStatus != PaymentStatus.Paid)
            return false;

        _logger.LogInformation("Processing refund of ${Amount} for booking {BookingId} (Intent: {PaymentIntentId})",
            booking.AmountPaid, booking.Id, booking.PaymentIntentId);

        booking.PaymentStatus = PaymentStatus.Refunded;
        await _db.SaveChangesAsync();
        return true;
    }
}
