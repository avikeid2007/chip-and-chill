namespace ChipAndChill.Api.Models;

public class TenantScheduleSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string FirstTeeTime { get; set; } = "06:00"; // e.g. "06:00"
    public string LastTeeTime { get; set; } = "18:00";  // e.g. "18:00"
    public int SlotIntervalMinutes { get; set; } = 10;   // 8, 10, 12, 15, 20
    public int DefaultMaxPlayers { get; set; } = 4;
    public decimal WeekdayPrice { get; set; } = 500m;
    public decimal WeekendPrice { get; set; } = 750m;
    public int AdvanceBookingDays { get; set; } = 14;    // rolling booking horizon
    public bool AutoGenerateEnabled { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
