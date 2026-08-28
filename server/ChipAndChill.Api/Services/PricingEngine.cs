using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public class PricingEngine : IPricingEngine
{
    private readonly AppDbContext _db;

    public PricingEngine(AppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> CalculatePriceAsync(Guid tenantId, DateTime slotTime, decimal fallbackPrice)
    {
        var (price, _) = await EvaluateRuleAsync(tenantId, slotTime, fallbackPrice);
        return price;
    }

    public async Task<(decimal Price, PricingRule? MatchedRule)> EvaluateRuleAsync(Guid tenantId, DateTime slotTime, decimal fallbackPrice)
    {
        var activeRules = await _db.PricingRules
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId && r.IsActive)
            .OrderByDescending(r => r.Priority)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync();

        if (activeRules.Count == 0)
            return (fallbackPrice, null);

        var dayOfWeek = slotTime.DayOfWeek;
        var slotTimeOnly = TimeOnly.FromDateTime(slotTime);

        foreach (var rule in activeRules)
        {
            if (!MatchesDay(rule.Days, dayOfWeek))
                continue;

            if (!MatchesTime(rule.StartTime, rule.EndTime, slotTimeOnly))
                continue;

            // Found highest-priority matching rule!
            return (rule.Price, rule);
        }

        return (fallbackPrice, null);
    }

    private static bool MatchesDay(PricingDays days, DayOfWeek day)
    {
        return days switch
        {
            PricingDays.All => true,
            PricingDays.Weekday => day >= DayOfWeek.Monday && day <= DayOfWeek.Friday,
            PricingDays.Weekend => day == DayOfWeek.Saturday || day == DayOfWeek.Sunday,
            PricingDays.Monday => day == DayOfWeek.Monday,
            PricingDays.Tuesday => day == DayOfWeek.Tuesday,
            PricingDays.Wednesday => day == DayOfWeek.Wednesday,
            PricingDays.Thursday => day == DayOfWeek.Thursday,
            PricingDays.Friday => day == DayOfWeek.Friday,
            PricingDays.Saturday => day == DayOfWeek.Saturday,
            PricingDays.Sunday => day == DayOfWeek.Sunday,
            _ => true
        };
    }

    private static bool MatchesTime(TimeOnly? start, TimeOnly? end, TimeOnly target)
    {
        if (start is null && end is null)
            return true;

        if (start is not null && end is null)
            return target >= start.Value;

        if (start is null && end is not null)
            return target < end.Value;

        if (start is not null && end is not null)
        {
            var s = start.Value;
            var e = end.Value;

            if (s <= e)
            {
                return target >= s && target < e;
            }
            else
            {
                // Overnight window (e.g. 20:00 to 06:00)
                return target >= s || target < e;
            }
        }

        return true;
    }
}
