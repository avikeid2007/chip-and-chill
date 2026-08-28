using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public interface IPricingEngine
{
    Task<decimal> CalculatePriceAsync(Guid tenantId, DateTime slotTime, decimal fallbackPrice);
    Task<(decimal Price, PricingRule? MatchedRule)> EvaluateRuleAsync(Guid tenantId, DateTime slotTime, decimal fallbackPrice);
}
