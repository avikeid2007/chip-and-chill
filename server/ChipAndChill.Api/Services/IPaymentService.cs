using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public interface IPaymentService
{
    Task<StripeConnectResponse> CreateConnectAccountLinkAsync(Tenant tenant, string returnUrl, string refreshUrl);
    Task<StripeStatusResponse> GetAccountStatusAsync(Tenant tenant);
    Task<CheckoutSessionResponse> CreateBookingCheckoutSessionAsync(Booking booking, Tenant tenant, ApplicationUser user, decimal amount, string successUrl, string cancelUrl);
    Task<PaymentConfirmationResponse> ConfirmSandboxPaymentAsync(Booking booking, decimal amount, string? cardHolder, string? cardLast4);
    Task<bool> ProcessRefundAsync(Booking booking);
}
