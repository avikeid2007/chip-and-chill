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
    public string? Address { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CourseHole> Holes { get; set; } = new List<CourseHole>();
    public ICollection<TeeSlot> TeeSlots { get; set; } = new List<TeeSlot>();
}

