using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.DTOs;

public record RangeBayDto(
    Guid Id,
    Guid TenantId,
    int BayNumber,
    string Name,
    bool IsOutdoor,
    bool HasLaunchMonitor,
    decimal HourlyRate,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateRangeBayRequest(
    int BayNumber,
    string Name,
    bool IsOutdoor,
    bool HasLaunchMonitor,
    decimal HourlyRate,
    bool IsActive
);

public record UpdateRangeBayRequest(
    int? BayNumber,
    string? Name,
    bool? IsOutdoor,
    bool? HasLaunchMonitor,
    decimal? HourlyRate,
    bool? IsActive
);

public record BayBookingDto(
    Guid Id,
    Guid TenantId,
    Guid RangeBayId,
    string BayName,
    int BayNumber,
    Guid? UserId,
    string GolferName,
    string GolferEmail,
    DateTime StartTime,
    DateTime EndTime,
    int DurationMinutes,
    BayBookingStatus Status,
    decimal Price,
    BayPaymentStatus PaymentStatus,
    decimal AmountPaid,
    DateTime CreatedAt
);

public record CreateBayBookingRequest(
    Guid RangeBayId,
    string GolferName,
    string GolferEmail,
    DateTime StartTime,
    int DurationMinutes // 30, 60, 90, 120
);

public record RangeAvailabilitySlotDto(
    Guid RangeBayId,
    int BayNumber,
    string BayName,
    bool HasLaunchMonitor,
    bool IsOutdoor,
    decimal Price,
    DateTime StartTime,
    DateTime EndTime,
    bool IsAvailable
);

public record RangeLiveStatusDto(
    int TotalBays,
    int OccupiedBays,
    int AvailableBays,
    int MaintenanceBays,
    IEnumerable<BayLiveStatusItemDto> Bays
);

public record BayLiveStatusItemDto(
    Guid BayId,
    int BayNumber,
    string Name,
    bool HasLaunchMonitor,
    bool IsOutdoor,
    bool IsActive,
    string Status, // "Available", "Occupied", "Maintenance"
    Guid? CurrentBookingId,
    string? GolferName,
    DateTime? SessionStartTime,
    DateTime? SessionEndTime,
    int? RemainingMinutes,
    int? TotalDurationMinutes
);
