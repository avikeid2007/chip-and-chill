using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public class TeeSlotAutoGeneratorHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TeeSlotAutoGeneratorHostedService> _logger;

    public TeeSlotAutoGeneratorHostedService(
        IServiceProvider serviceProvider,
        ILogger<TeeSlotAutoGeneratorHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TeeSlot Auto-Generator Background Service started.");

        // Wait 5 seconds after startup before the initial pass
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunAutoGenerationPassAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during automated tee slot generation pass.");
            }

            // Check and rollover every 6 hours
            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }

    private async Task RunAutoGenerationPassAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var generator = scope.ServiceProvider.GetRequiredService<ITeeSlotGeneratorService>();

        var courses = await db.Tenants
            .IgnoreQueryFilters()
            .Where(t => t.Type == TenantType.Course)
            .ToListAsync(stoppingToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        foreach (var course in courses)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                var settings = await generator.GetOrCreateSettingsAsync(course.Id);
                if (!settings.AutoGenerateEnabled) continue;

                var horizonEnd = today.AddDays(Math.Max(1, settings.AdvanceBookingDays));
                var result = await generator.GenerateSlotsForTenantAsync(course.Id, today, horizonEnd, settings);

                if (result.SlotsCreated > 0)
                {
                    _logger.LogInformation("Auto-Rollover: Created {Created} new tee slots for '{CourseName}' up to {HorizonEnd}",
                        result.SlotsCreated, course.Name, horizonEnd);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed automated slot generation for course {CourseId} ({CourseName})", course.Id, course.Name);
            }
        }
    }
}
