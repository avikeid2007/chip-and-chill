using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

// ---- Users / profile ----
public record UpdateProfileRequest(
    string FirstName,
    string LastName,
    string? PhoneNumber = null,
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
    bool? SmsAlertsEnabled = null,
    bool? MarketingEnabled = null
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record GolferCareerSummaryDto(
    int TotalRounds,
    double? BestRoundScore,
    int TournamentsPlayed,
    int RangeSessionsBooked,
    int TeeTimesBooked
);

public record UserProfileResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    AppRole Role,
    Guid? TenantId,
    double? HandicapIndex,
    DateTime CreatedAt,
    string? AvatarUrl,
    string? Bio,
    string? City,
    string? Country,
    string? HomeClubName,
    string? Handedness,
    string? PreferredTee,
    string? AverageScore,
    string? PlayFrequency,
    string? Driver,
    string? Irons,
    string? Putter,
    string? GolfBall,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    bool SmsAlertsEnabled,
    bool MarketingEnabled,
    GolferCareerSummaryDto? CareerStats = null
);

// ---- Password reset ----
public record ForgotPasswordRequest(string Email, string? ClientUrl = null);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);

// ---- Staff management ----
public record InviteStaffRequest(string Email, string Password, string FirstName, string LastName);
// Role is a string (e.g. "CourseAdmin", "Staff") — NOT the enum int — so the client can
// match it against the AppRole union type without a JsonStringEnumConverter.
public record StaffMemberResponse(Guid Id, string Email, string FirstName, string LastName, bool IsActive, string Role = "Staff");

// ---- Admin bookings ----
public record AdminBookingResponse(Guid Id, Guid TeeSlotId, DateTime StartTime, string UserEmail, string UserName, int PartySize, BookingStatus Status, decimal Price, PaymentStatus PaymentStatus, decimal AmountPaid);
public record CheckInResponse(Guid Id, BookingStatus Status);


// ---- Slot blocking ----
public record UpdateTeeSlotRequest(bool IsBlocked);

// ---- Dashboard summary ----
public record DashboardSummaryResponse(int BookingsToday, int BookingsThisWeek, int UpcomingBookings, int TotalRounds, double OccupancyPercent, int ActiveSlotsToday);

// ---- Golfer stats (Phase 2) ----
// HoleCount lets the frontend chart distinguish 9-hole vs 18-hole rounds visually.
public record TrendPoint(DateTime PlayedOn, int Strokes, int Par, double? Differential, int HoleCount = 18);
public record HoleStat(int HoleNumber, double AvgStrokes, double AvgPar, int Birdies, int Pars, int Bogeys, int DoublesOrWorse);
public record BestRoundInfo(Guid RoundId, DateTime PlayedOn, int Strokes, int Par);
public record StatsResponse(
    double? HandicapIndex,
    double? AverageScore,
    double? AverageToPar,
    int RoundsPlayed,
    BestRoundInfo? BestRound,
    List<TrendPoint> Trend,
    List<HoleStat> Holes,
    int Full18Rounds);

