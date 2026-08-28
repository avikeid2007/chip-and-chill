using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

public record CreatePricingRuleRequest(
    string Name,
    PricingDays Days,
    string? StartTime,
    string? EndTime,
    decimal Price,
    int Priority = 1,
    bool IsActive = true);

public record UpdatePricingRuleRequest(
    string? Name,
    PricingDays? Days,
    string? StartTime,
    string? EndTime,
    decimal? Price,
    int? Priority,
    bool? IsActive);

public record PricingRuleResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    PricingDays Days,
    string? StartTime,
    string? EndTime,
    decimal Price,
    int Priority,
    bool IsActive,
    DateTime CreatedAt);

public record PricePreviewRequest(
    DateTime SlotTime,
    decimal? BasePrice);

public record PricePreviewResponse(
    DateTime SlotTime,
    decimal CalculatedPrice,
    decimal BasePrice,
    Guid? MatchedRuleId,
    string? MatchedRuleName);
