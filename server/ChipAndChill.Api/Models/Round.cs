namespace ChipAndChill.Api.Models;

public class Round
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public DateTime PlayedOn { get; set; }
    public string TeeBox { get; set; } = "White"; // White/Blue/Red etc.
    public double? HandicapDifferential { get; set; }

    // Course rating & slope for the tee box played (WHS handicap inputs).
    // Defaults approximate a typical regulation course so existing rounds
    // still produce sensible differentials.
    public double CourseRating { get; set; } = 72.0;
    public int SlopeRating { get; set; } = 113;

    public ICollection<RoundHole> Holes { get; set; } = new List<RoundHole>();
}

public class RoundHole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoundId { get; set; }
    public Round? Round { get; set; }

    public int HoleNumber { get; set; }
    public int Par { get; set; }
    public int Strokes { get; set; }
}

