namespace ChipAndChill.Api.Models;

// A golfer waiting for a full tee slot to open up. When a booking on the
// slot is cancelled, the first active entry (by JoinedAt) gets notified.
public class WaitlistEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid TeeSlotId { get; set; }
    public TeeSlot? TeeSlot { get; set; }

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public int PartySize { get; set; } = 1;
    public bool Notified { get; set; } = false; // set true once emailed on a cancellation
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

