namespace ChipAndChill.Api.DTOs;

// Partial update — only fields present (non-null) are applied. Prevents wiping
// branding/address/timezone when a page only intends to edit a subset.
public record UpdateTenantRequest(
    string? Name,
    string? Description,
    string? Address,
    string? LogoUrl,
    string? PrimaryColor,
    string? Subdomain,
    string? CustomDomain,
    string? Timezone,
    string? Currency,
    string? CurrencySymbol,
    bool? RequirePaymentUpfront);

public record ResolvedTenantResponse(
    Guid Id,
    string Name,
    string? Subdomain,
    string? CustomDomain,
    string? LogoUrl,
    string? PrimaryColor,
    bool RequirePaymentUpfront,
    bool StripeChargesEnabled,
    string Timezone,
    string Currency,
    string CurrencySymbol,
    string? Address,
    string? Description);
