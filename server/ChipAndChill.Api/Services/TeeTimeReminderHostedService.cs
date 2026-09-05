using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public class TeeTimeReminderHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TeeTimeReminderHostedService> _logger;

    public TeeTimeReminderHostedService(
        IServiceProvider serviceProvider,
        ILogger<TeeTimeReminderHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Tee Time Automated Reminder Background Worker started.");

        // Initial delay before first sweep
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepAndSendRemindersAsync();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error occurred in Tee Time Reminder sweep.");
            }

            // Run sweep every 5 minutes
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    private async Task SweepAndSendRemindersAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<ITenantNotificationService>();

        var now = DateTime.UtcNow;
        var maxHorizon = now.AddHours(36);
        var minHorizon = now.AddHours(-14);

        // Find upcoming confirmed bookings that haven't been reminded yet
        var bookings = await db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.User)
            .Include(b => b.TeeSlot)
            .Include(b => b.Tenant)
            .Where(b => b.Status == BookingStatus.Confirmed
                     && b.ReminderSentAt == null
                     && b.TeeSlot != null
                     && b.TeeSlot.StartTime >= minHorizon
                     && b.TeeSlot.StartTime <= maxHorizon)
            .ToListAsync();

        if (bookings.Count == 0) return;

        foreach (var booking in bookings)
        {
            try
            {
                if (booking.User != null && booking.TeeSlot != null)
                {
                    var tenantLocalNow = GetTenantLocalTime(now, booking.Tenant?.Timezone);
                    var reminderHorizon = tenantLocalNow.AddHours(24);

                    if (booking.TeeSlot.StartTime < tenantLocalNow || booking.TeeSlot.StartTime > reminderHorizon)
                    {
                        continue;
                    }

                    await notificationService.SendTeeTimeReminderAsync(booking.TenantId, booking, booking.User, booking.TeeSlot);
                    booking.ReminderSentAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                    _logger.LogInformation("Dispatched tee time reminder to {User} for booking {BookingId}", booking.User.Email, booking.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send tee time reminder for booking {BookingId}", booking.Id);
            }
        }
    }

    private static DateTime GetTenantLocalTime(DateTime utcTime, string? timezoneId)
    {
        if (string.IsNullOrWhiteSpace(timezoneId) || timezoneId == "UTC") return utcTime;
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
            return TimeZoneInfo.ConvertTimeFromUtc(utcTime, tz);
        }
        catch
        {
            return utcTime;
        }
    }
}
