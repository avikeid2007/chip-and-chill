using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

public record TournamentSummaryResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Description,
    TournamentFormat Format,
    TournamentStatus Status,
    DateTime StartDate,
    DateTime EndDate,
    decimal EntryFee,
    int MaxParticipants,
    int RegisteredCount,
    int HolesCount,
    bool IsPublic,
    DateTime CreatedAt
);

public record TournamentDetailResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Description,
    TournamentFormat Format,
    TournamentStatus Status,
    DateTime StartDate,
    DateTime EndDate,
    decimal EntryFee,
    int MaxParticipants,
    int RegisteredCount,
    int HolesCount,
    bool IsPublic,
    DateTime CreatedAt,
    IEnumerable<TournamentRegistrationDto> Registrations,
    IEnumerable<TournamentLeaderboardRowDto> Leaderboard
);

public record TournamentRegistrationDto(
    Guid Id,
    Guid TournamentId,
    Guid? UserId,
    string GolferName,
    string GolferEmail,
    decimal? HandicapIndex,
    TournamentRegistrationStatus Status,
    TournamentPaymentStatus PaymentStatus,
    decimal AmountPaid,
    int? PairingGroup,
    DateTime? TeeTime,
    DateTime RegisteredAt
);

public record CreateTournamentRequest(
    string Name,
    string? Description,
    TournamentFormat Format,
    DateTime StartDate,
    DateTime EndDate,
    decimal EntryFee,
    int MaxParticipants,
    int HolesCount,
    bool IsPublic
);

public record UpdateTournamentRequest(
    string? Name,
    string? Description,
    TournamentFormat? Format,
    TournamentStatus? Status,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal? EntryFee,
    int? MaxParticipants,
    int? HolesCount,
    bool? IsPublic
);

public record RegisterTournamentRequest(
    string GolferName,
    string GolferEmail,
    decimal? HandicapIndex
);

public record PostTournamentScoreRequest(
    Guid RegistrationId,
    int HoleNumber,
    int GrossScore,
    int Par
);

public record BatchPostTournamentScoresRequest(
    Guid RegistrationId,
    List<HoleScoreItem> Scores
);

public record HoleScoreItem(
    int HoleNumber,
    int GrossScore,
    int Par
);

public record GeneratePairingsRequest(
    int PlayersPerGroup = 4,
    int IntervalMinutes = 8,
    DateTime? FirstTeeTime = null
);

public record TournamentLeaderboardRowDto(
    int Rank,
    Guid RegistrationId,
    Guid? UserId,
    string GolferName,
    decimal? HandicapIndex,
    int ThruHoles,
    int TotalGross,
    int ToPar,
    int StablefordPoints,
    int Eagles,
    int Birdies,
    int Pars,
    int Bogeys,
    int DoublePlus,
    int? PairingGroup,
    DateTime? TeeTime
);
