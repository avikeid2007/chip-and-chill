using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

public record StripeConnectResponse(string Url, string AccountId);

public record StripeStatusResponse(
    bool IsConnected,
    string? AccountId,
    bool PayoutsEnabled,
    bool ChargesEnabled,
    bool RequirePaymentUpfront);

public record CreateCheckoutRequest(string? ReturnUrl);

public record CheckoutSessionResponse(
    string SessionId,
    string? CheckoutUrl,
    string Mode, // "Stripe" or "Sandbox"
    decimal Amount,
    string Currency);

public record ConfirmSandboxPaymentRequest(
    string? CardHolderName,
    string? CardNumberLast4);

public record PaymentConfirmationResponse(
    Guid BookingId,
    PaymentStatus PaymentStatus,
    decimal AmountPaid,
    string? TransactionId);

public record RefundResponse(
    Guid BookingId,
    PaymentStatus PaymentStatus,
    decimal AmountRefunded);
