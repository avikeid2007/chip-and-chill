namespace ChipAndChill.Api.Models;

public class TeeSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public DateTime StartTime { get; set; } // UTC
    public int MaxPlayers { get; set; } = 4;
    public decimal Price { get; set; }
    public bool IsBlocked { get; set; } = false; // admin can block a slot manually

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public enum BookingStatus
{
    Confirmed,
    CheckedIn,
    Cancelled
}

public enum PaymentStatus
{
    Unpaid,
    Paid,
    Refunded
}

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid TeeSlotId { get; set; }
    public TeeSlot? TeeSlot { get; set; }

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public int PartySize { get; set; } = 1;
    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? PaymentIntentId { get; set; }
    public decimal AmountPaid { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


