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
    decimal PrizePurse,
    int RoundsCount,
    int CurrentRound,
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
    decimal PrizePurse,
    int? ClosestToPinHole,
    string? ClosestToPinWinner,
    int? LongestDriveHole,
    string? LongestDriveWinner,
    int RoundsCount,
    int CurrentRound,
    string? CutRule,
    int? CutAppliedAfterRound,
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
    string? Flight,
    bool MadeCut,
    int? PointsEarned,
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
    bool IsPublic,
    decimal? PrizePurse = null,
    int RoundsCount = 1
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
    bool? IsPublic,
    decimal? PrizePurse,
    int? ClosestToPinHole,
    string? ClosestToPinWinner,
    int? LongestDriveHole,
    string? LongestDriveWinner,
    int? RoundsCount,
    int? CurrentRound,
    string? CutRule
);

public record RegisterTournamentRequest(
    string GolferName,
    string GolferEmail,
    decimal? HandicapIndex,
    string? Flight = null
);

public record UpdateFlightRequest(
    string? Flight
);

public record AutoFlightRuleItem(
    string FlightName,
    decimal MinHandicap,
    decimal MaxHandicap
);

public record AutoFlightRequest(
    List<AutoFlightRuleItem> Rules
);

public record UpdateTournamentSideContestsRequest(
    int? ClosestToPinHole,
    string? ClosestToPinWinner,
    int? LongestDriveHole,
    string? LongestDriveWinner,
    decimal? PrizePurse
);

public record PostTournamentScoreRequest(
    Guid RegistrationId,
    int HoleNumber,
    int GrossScore,
    int Par,
    int RoundNumber = 1
);

public record BatchPostTournamentScoresRequest(
    Guid RegistrationId,
    List<HoleScoreItem> Scores,
    int RoundNumber = 1
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

public record UpdateRegistrationPairingRequest(
    int? PairingGroup,
    DateTime? TeeTime
);

public record PairingAssignmentItem(
    Guid RegistrationId,
    int? PairingGroup,
    DateTime? TeeTime
);

public record BatchUpdatePairingsRequest(
    List<PairingAssignmentItem> Assignments
);

public record ApplyCutRequest(
    int CutRank = 30,
    bool IncludeTies = true,
    int AfterRound = 1
);

public record UpdateCurrentRoundRequest(
    int RoundNumber
);

public record TournamentHoleScoreDto(
    int HoleNumber,
    int GrossScore,
    int Par,
    int Points,
    int RoundNumber = 1
);

public record TournamentLeaderboardRowDto(
    int Rank,
    Guid RegistrationId,
    Guid? UserId,
    string GolferName,
    decimal? HandicapIndex,
    string? Flight,
    bool MadeCut,
    int ThruHoles,
    int TotalGross,
    int ToPar,
    int TotalNet,
    int NetToPar,
    int StablefordPoints,
    int Eagles,
    int Birdies,
    int Pars,
    int Bogeys,
    int DoublePlus,
    int? PairingGroup,
    DateTime? TeeTime,
    List<int> RoundGrossScores,
    List<TournamentHoleScoreDto> HoleScores
);

public record TournamentSkinsResultDto(
    int HoleNumber,
    Guid? WinnerRegistrationId,
    string? WinnerName,
    string? Flight,
    int WinningScore,
    int Par,
    bool IsNet,
    bool IsCarryover,
    int Value
);

public record TournamentSkinsSummaryDto(
    int TotalSkins,
    decimal TotalPot,
    List<TournamentSkinsResultDto> GrossSkins,
    List<TournamentSkinsResultDto> NetSkins
);

public record TournamentPayoutRowDto(
    int Rank,
    Guid RegistrationId,
    string GolferName,
    string? Flight,
    decimal PayoutAmount,
    double PursePercentage,
    bool IsTie,
    int TotalGross,
    int NetToPar
);

public record TournamentPayoutsResponse(
    decimal TotalPurse,
    int TotalPaidPlaces,
    List<TournamentPayoutRowDto> Payouts
);

public record OrderOfMeritRowDto(
    int Rank,
    string GolferName,
    string GolferEmail,
    decimal? HandicapIndex,
    int TotalPoints,
    int TournamentsPlayed,
    int Wins,
    int Top10s,
    decimal TotalEarnings
);

public record OrderOfMeritResponse(
    Guid TenantId,
    string SeasonName,
    List<OrderOfMeritRowDto> Standings
);
