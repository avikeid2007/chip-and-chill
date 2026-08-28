namespace ChipAndChill.Api.Models;

public enum BayBookingStatus
{
    Confirmed,
    Active,
    Completed,
    Cancelled
}

public enum BayPaymentStatus
{
    Unpaid,
    Paid,
    Refunded
}

public class RangeBay
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public int BayNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsOutdoor { get; set; } = false;
    public bool HasLaunchMonitor { get; set; } = true;
    public decimal HourlyRate { get; set; } = 300m; // Default ₹300 / $30
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
    public ICollection<BayBooking> Bookings { get; set; } = new List<BayBooking>();
}

public class BayBooking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid RangeBayId { get; set; }
    public Guid? UserId { get; set; }
    public string GolferName { get; set; } = string.Empty;
    public string GolferEmail { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public BayBookingStatus Status { get; set; } = BayBookingStatus.Confirmed;
    public decimal Price { get; set; }
    public BayPaymentStatus PaymentStatus { get; set; } = BayPaymentStatus.Unpaid;
    public decimal AmountPaid { get; set; } = 0m;
    public string? PaymentIntentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
    public RangeBay? RangeBay { get; set; }
    public ApplicationUser? User { get; set; }
}
