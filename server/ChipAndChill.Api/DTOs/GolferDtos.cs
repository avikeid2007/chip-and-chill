namespace ChipAndChill.Api.DTOs;

public record TenantGolferSummaryDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    double? HandicapIndex,
    DateTime? MemberSince,
    int TotalBookings,
    int TotalTournaments,
    int TotalRangeBookings,
    int TotalRounds,
    decimal LifetimeSpend,
    DateTime? LastActivityAt,
    string? AvatarUrl = null,
    string? City = null,
    string? HomeClubName = null,
    string? PreferredTee = null
);

public record TenantGolferRecentBookingDto(
    Guid BookingId,
    string Date,
    string StartTime,
    int PartySize,
    string Status,
    decimal Price,
    string PaymentStatus
);

public record TenantGolferRecentTournamentDto(
    Guid TournamentId,
    string TournamentName,
    string Format,
    string StartDate,
    string RegistrationStatus,
    string PaymentStatus,
    int? Rank,
    int? ToPar
);

public record TenantGolferRecentRangeDto(
    Guid BookingId,
    string BayName,
    string StartTime,
    int DurationMinutes,
    string Status,
    decimal Price
);

public record TenantGolferDetailDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    double? HandicapIndex,
    DateTime? MemberSince,
    int TotalBookings,
    int TotalTournaments,
    int TotalRangeBookings,
    int TotalRounds,
    decimal LifetimeSpend,
    DateTime? LastActivityAt,
    List<TenantGolferRecentBookingDto> RecentBookings,
    List<TenantGolferRecentTournamentDto> RecentTournaments,
    List<TenantGolferRecentRangeDto> RecentRangeSessions,
    // Golfer Passport Fields
    string? AvatarUrl = null,
    string? Bio = null,
    string? City = null,
    string? Country = null,
    string? HomeClubName = null,
    string? Handedness = null,
    string? PreferredTee = null,
    string? AverageScore = null,
    string? PlayFrequency = null,
    string? Driver = null,
    string? Irons = null,
    string? Putter = null,
    string? GolfBall = null,
    string? EmergencyContactName = null,
    string? EmergencyContactPhone = null,
    bool SmsAlertsEnabled = true,
    bool MarketingEnabled = false
);

public record CreateTenantGolferRequest(
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    double? HandicapIndex,
    string? Password
);
