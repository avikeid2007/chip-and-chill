namespace ChipAndChill.Api.Models;

public class CourseHole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public int HoleNumber { get; set; } // 1-18
    public int Par { get; set; }
    public int YardageWhite { get; set; }
    public int? YardageBlue { get; set; }
    public int? YardageRed { get; set; }
    public string? Notes { get; set; }
}

