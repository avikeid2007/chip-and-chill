using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

// ---- Users / profile ----
public record UpdateProfileRequest(string FirstName, string LastName, string? PhoneNumber);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UserProfileResponse(Guid Id, string Email, string FirstName, string LastName, string? PhoneNumber, AppRole Role, Guid? TenantId, double? HandicapIndex);

// ---- Password reset ----
public record ForgotPasswordRequest(string Email, string? ClientUrl = null);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);

// ---- Staff management ----
public record InviteStaffRequest(string Email, string Password, string FirstName, string LastName);
public record StaffMemberResponse(Guid Id, string Email, string FirstName, string LastName, bool IsActive);

// ---- Admin bookings ----
public record AdminBookingResponse(Guid Id, Guid TeeSlotId, DateTime StartTime, string UserEmail, string UserName, int PartySize, BookingStatus Status, decimal Price, PaymentStatus PaymentStatus, decimal AmountPaid);
public record CheckInResponse(Guid Id, BookingStatus Status);


// ---- Slot blocking ----
public record UpdateTeeSlotRequest(bool IsBlocked);

// ---- Dashboard summary ----
public record DashboardSummaryResponse(int BookingsToday, int BookingsThisWeek, int UpcomingBookings, int TotalRounds, double OccupancyPercent, int ActiveSlotsToday);

// ---- Golfer stats (Phase 2) ----
public record TrendPoint(DateTime PlayedOn, int Strokes, int Par, double? Differential);
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

