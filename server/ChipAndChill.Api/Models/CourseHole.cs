using System.Text.Json.Serialization;

namespace ChipAndChill.Api.Models;

public class CourseHole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    [JsonIgnore]
    public Tenant? Tenant { get; set; }

    public int HoleNumber { get; set; } // 1-18
    public int Par { get; set; } = 4;
    public int HandicapIndex { get; set; } = 1; // Stroke Index 1-18
    public int? YardageBlack { get; set; }      // Championship Tee
    public int? YardageBlue { get; set; }       // Tournament Tee
    public int YardageWhite { get; set; } = 380; // Member Tee
    public int? YardageGold { get; set; }       // Senior Tee
    public int? YardageRed { get; set; }        // Forward Tee
    public string? Notes { get; set; }
}

