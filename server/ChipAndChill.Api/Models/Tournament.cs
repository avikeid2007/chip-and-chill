namespace ChipAndChill.Api.Models;

public enum TournamentFormat
{
    StrokePlay,
    Stableford,
    Scramble,
    MatchPlay
}

public enum TournamentStatus
{
    Upcoming,
    InProgress,
    Completed,
    Cancelled
}

public enum TournamentRegistrationStatus
{
    Registered,
    Confirmed,
    Withdrawn
}

public enum TournamentPaymentStatus
{
    Unpaid,
    Paid,
    Refunded,
    Free
}

public class Tournament
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TournamentFormat Format { get; set; } = TournamentFormat.StrokePlay;
    public TournamentStatus Status { get; set; } = TournamentStatus.Upcoming;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal EntryFee { get; set; } = 0m;
    public int MaxParticipants { get; set; } = 72;
    public int HolesCount { get; set; } = 18;
    public bool IsPublic { get; set; } = true;
    public decimal PrizePurse { get; set; } = 0m;
    public int? ClosestToPinHole { get; set; }
    public string? ClosestToPinWinner { get; set; }
    public int? LongestDriveHole { get; set; }
    public string? LongestDriveWinner { get; set; }
    public int RoundsCount { get; set; } = 1;
    public int CurrentRound { get; set; } = 1;
    public string? CutRule { get; set; }
    public int? CutAppliedAfterRound { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
    public ICollection<TournamentRegistration> Registrations { get; set; } = new List<TournamentRegistration>();
    public ICollection<TournamentScore> Scores { get; set; } = new List<TournamentScore>();
}

public class TournamentRegistration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TournamentId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string GolferName { get; set; } = string.Empty;
    public string GolferEmail { get; set; } = string.Empty;
    public decimal? HandicapIndex { get; set; }
    public string? Flight { get; set; }
    public bool MadeCut { get; set; } = true;
    public int? PointsEarned { get; set; }
    public TournamentRegistrationStatus Status { get; set; } = TournamentRegistrationStatus.Registered;
    public TournamentPaymentStatus PaymentStatus { get; set; } = TournamentPaymentStatus.Unpaid;
    public decimal AmountPaid { get; set; } = 0m;
    public string? PaymentIntentId { get; set; }
    public int? PairingGroup { get; set; }
    public DateTime? TeeTime { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    public Tournament? Tournament { get; set; }
    public ApplicationUser? User { get; set; }
    public ICollection<TournamentScore> Scores { get; set; } = new List<TournamentScore>();
}

public class TournamentScore
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TournamentId { get; set; }
    public Guid TenantId { get; set; }
    public Guid RegistrationId { get; set; }
    public Guid? UserId { get; set; }
    public int RoundNumber { get; set; } = 1;
    public int HoleNumber { get; set; }
    public int GrossScore { get; set; }
    public int Par { get; set; } = 4;
    public int Points { get; set; } = 0; // For Stableford
    public DateTime EnteredAt { get; set; } = DateTime.UtcNow;

    public Tournament? Tournament { get; set; }
    public TournamentRegistration? Registration { get; set; }
}
