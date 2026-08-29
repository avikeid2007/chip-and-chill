using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public record BulkGenerationResult(int SlotsCreated, int SlotsSkipped, int TotalDaysProcessed);

public interface ITeeSlotGeneratorService
{
    Task<TenantScheduleSettings> GetOrCreateSettingsAsync(Guid tenantId);
    Task<TenantScheduleSettings> UpdateSettingsAsync(Guid tenantId, TenantScheduleSettings updated);
    Task<BulkGenerationResult> GenerateSlotsForTenantAsync(Guid tenantId, DateOnly startDate, DateOnly endDate, TenantScheduleSettings? customSettings = null);
}

public class TeeSlotGeneratorService : ITeeSlotGeneratorService
{
    private readonly AppDbContext _db;
    private readonly ILogger<TeeSlotGeneratorService> _logger;

    public TeeSlotGeneratorService(AppDbContext db, ILogger<TeeSlotGeneratorService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<TenantScheduleSettings> GetOrCreateSettingsAsync(Guid tenantId)
    {
        var settings = await _db.TenantScheduleSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (settings == null)
        {
            try
            {
                settings = new TenantScheduleSettings
                {
                    TenantId = tenantId
                };
                _db.TenantScheduleSettings.Add(settings);
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                settings = await _db.TenantScheduleSettings
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId) ?? new TenantScheduleSettings { TenantId = tenantId };
            }
        }

        return settings;
    }

    public async Task<TenantScheduleSettings> UpdateSettingsAsync(Guid tenantId, TenantScheduleSettings updated)
    {
        var settings = await GetOrCreateSettingsAsync(tenantId);

        settings.FirstTeeTime = !string.IsNullOrWhiteSpace(updated.FirstTeeTime) ? updated.FirstTeeTime.Trim() : "06:00";
        settings.LastTeeTime = !string.IsNullOrWhiteSpace(updated.LastTeeTime) ? updated.LastTeeTime.Trim() : "18:00";
        settings.SlotIntervalMinutes = updated.SlotIntervalMinutes > 0 ? updated.SlotIntervalMinutes : 10;
        settings.DefaultMaxPlayers = updated.DefaultMaxPlayers > 0 ? updated.DefaultMaxPlayers : 4;
        settings.WeekdayPrice = updated.WeekdayPrice >= 0 ? updated.WeekdayPrice : 500m;
        settings.WeekendPrice = updated.WeekendPrice >= 0 ? updated.WeekendPrice : 750m;
        settings.AdvanceBookingDays = Math.Clamp(updated.AdvanceBookingDays, 1, 90);
        settings.AutoGenerateEnabled = updated.AutoGenerateEnabled;
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return settings;
    }

    public async Task<BulkGenerationResult> GenerateSlotsForTenantAsync(
        Guid tenantId,
        DateOnly startDate,
        DateOnly endDate,
        TenantScheduleSettings? customSettings = null)
    {
        var settings = customSettings ?? await GetOrCreateSettingsAsync(tenantId);

        var firstTime = ParseTime(settings.FirstTeeTime, new TimeOnly(6, 0));
        var lastTime = ParseTime(settings.LastTeeTime, new TimeOnly(18, 0));
        var interval = Math.Max(5, settings.SlotIntervalMinutes);
        var maxPlayers = Math.Max(1, settings.DefaultMaxPlayers);

        // Fetch existing slot start times within the overall range to prevent duplicates
        var rangeStart = startDate.ToDateTime(TimeOnly.MinValue);
        var rangeEnd = endDate.AddDays(1).ToDateTime(TimeOnly.MinValue);

        var existingSlotTimes = await _db.TeeSlots
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && s.StartTime >= rangeStart && s.StartTime < rangeEnd)
            .Select(s => s.StartTime)
            .ToListAsync();

        var existingSet = new HashSet<DateTime>(existingSlotTimes);

        var slotsToCreate = new List<TeeSlot>();
        var skippedCount = 0;
        var daysProcessed = 0;

        var curDate = startDate;
        while (curDate <= endDate)
        {
            daysProcessed++;
            var isWeekend = curDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var price = isWeekend ? settings.WeekendPrice : settings.WeekdayPrice;

            var currentTime = firstTime;
            while (currentTime <= lastTime)
            {
                var slotDateTime = curDate.ToDateTime(currentTime);

                if (existingSet.Contains(slotDateTime))
                {
                    skippedCount++;
                }
                else
                {
                    slotsToCreate.Add(new TeeSlot
                    {
                        TenantId = tenantId,
                        StartTime = slotDateTime,
                        MaxPlayers = maxPlayers,
                        Price = price,
                        IsBlocked = false
                    });
                    existingSet.Add(slotDateTime); // protect in-memory within loop
                }

                currentTime = currentTime.AddMinutes(interval);
            }

            curDate = curDate.AddDays(1);
        }

        if (slotsToCreate.Count > 0)
        {
            _db.TeeSlots.AddRange(slotsToCreate);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Generated {Count} tee slots for tenant {TenantId} across {Days} days ({Skipped} skipped)", slotsToCreate.Count, tenantId, daysProcessed, skippedCount);
        }

        return new BulkGenerationResult(slotsToCreate.Count, skippedCount, daysProcessed);
    }

    private static TimeOnly ParseTime(string? timeStr, TimeOnly fallback)
    {
        if (string.IsNullOrWhiteSpace(timeStr)) return fallback;
        return TimeOnly.TryParse(timeStr.Trim(), out var parsed) ? parsed : fallback;
    }
}
