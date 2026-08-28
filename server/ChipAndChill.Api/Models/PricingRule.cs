namespace ChipAndChill.Api.Models;

public enum PricingDays
{
    All,
    Weekday,
    Weekend,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday
}

public class PricingRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;
    public PricingDays Days { get; set; } = PricingDays.All;
    public TimeOnly? StartTime { get; set; } // e.g. 07:00
    public TimeOnly? EndTime { get; set; }   // e.g. 12:00
    public decimal Price { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
