namespace ChipAndChill.Api.Models;

public enum TenantType
{
    Course,
    Range
}

public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public TenantType Type { get; set; } = TenantType.Course;
    public string? Subdomain { get; set; }
    public string? CustomDomain { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string Timezone { get; set; } = "UTC";
    public string Currency { get; set; } = "INR";
    public string CurrencySymbol { get; set; } = "₹";
    public string? Address { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Course Visual Media & Contact
    public string? CoverImageUrl { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }

    // Course Architecture & Specifications
    public string? Architect { get; set; }
    public int? YearBuilt { get; set; }
    public string? CourseType { get; set; } = "Championship Links";
    public double? CourseRating { get; set; }
    public int? SlopeRating { get; set; }
    public string? GreensGrass { get; set; }
    public string? FairwaysGrass { get; set; }

    // Amenities (Comma-separated list or JSON)
    public string? Amenities { get; set; } = "Driving Range,Putting Green,Pro Shop,GPS Carts,Clubhouse Restaurant,Locker Rooms,PGA Lessons";

    // Policies
    public string? DressCode { get; set; } = "Collared shirts and tailored golf attire required. Soft spikes only.";
    public string? SpikePolicy { get; set; } = "Non-metal / soft spikes only.";

    // Stripe Connect & Payment Settings
    public string? StripeAccountId { get; set; }
    public bool StripePayoutsEnabled { get; set; } = false;
    public bool StripeChargesEnabled { get; set; } = false;
    public bool RequirePaymentUpfront { get; set; } = false;

    public ICollection<CourseHole> Holes { get; set; } = new List<CourseHole>();
    public ICollection<TeeSlot> TeeSlots { get; set; } = new List<TeeSlot>();
    public ICollection<PricingRule> PricingRules { get; set; } = new List<PricingRule>();
}


