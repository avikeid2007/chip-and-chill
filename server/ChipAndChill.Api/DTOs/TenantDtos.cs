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
    bool? RequirePaymentUpfront,
    string? CoverImageUrl = null,
    string? Phone = null,
    string? Email = null,
    string? Website = null,
    string? Architect = null,
    int? YearBuilt = null,
    string? CourseType = null,
    double? CourseRating = null,
    int? SlopeRating = null,
    string? GreensGrass = null,
    string? FairwaysGrass = null,
    string? Amenities = null,
    string? DressCode = null,
    string? SpikePolicy = null
);

public record CourseWeatherDto(
    string Condition,
    string Description,
    int TemperatureC,
    int TemperatureF,
    int FeelsLikeC,
    int FeelsLikeF,
    int WindSpeedMph,
    string WindDirection,
    int Humidity,
    string PlayabilityRating,
    string UpdatedAt
);

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
    string? Description,
    string? CoverImageUrl = null,
    string? Phone = null,
    string? Email = null,
    string? Website = null,
    string? Architect = null,
    int? YearBuilt = null,
    string? CourseType = null,
    double? CourseRating = null,
    int? SlopeRating = null,
    string? GreensGrass = null,
    string? FairwaysGrass = null,
    string? Amenities = null,
    string? DressCode = null,
    string? SpikePolicy = null
);
