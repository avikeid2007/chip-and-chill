using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;

namespace ChipAndChill.Api.Controllers;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record DailyRevenuePoint(string Date, decimal Tee, decimal Range);

public record RevenueReportResponse(
    // Hero KPIs
    decimal TotalRevenue,
    decimal TeeRevenue,
    decimal RangeRevenue,
    decimal PreviousPeriodRevenue,       // for % change calculation
    decimal PreviousTeePeriodRevenue,
    decimal PreviousRangePeriodRevenue,

    // Tee-sheet performance
    int TotalBookings,
    int CheckedIn,
    int Cancelled,
    double OccupancyPercent,
    double AveragePartySize,

    // Daily chart data
    List<DailyRevenuePoint> Daily
);

public record HourlyDistribution(
    int Hour,
    string HourLabel,
    int TotalSlots,
    int BookedSlots,
    int TotalGolfers,
    double OccupancyPercent,
    decimal Revenue
);

public record TimeOfDayBucket(
    string Name,
    string TimeRange,
    int TotalSlots,
    int BookedSlots,
    int TotalGolfers,
    double OccupancyPercent,
    decimal Revenue
);

public record DayOfWeekDistribution(
    string Day,
    string ShortDay,
    int TotalSlots,
    int BookedSlots,
    int TotalGolfers,
    double OccupancyPercent,
    decimal Revenue
);

public record TeeSheetReportResponse(
    int TotalSlots,
    int BookedSlots,
    int TotalGolfers,
    double OverallOccupancyPercent,
    double WeekdayOccupancyPercent,
    double WeekendOccupancyPercent,
    double CheckInRate,
    double CancellationRate,
    double AveragePartySize,
    List<HourlyDistribution> Hourly,
    List<TimeOfDayBucket> TimeOfDay,
    List<DayOfWeekDistribution> DaysOfWeek
);

public record TopGolferDto(
    Guid UserId,
    string Name,
    string Email,
    string? AvatarUrl,
    int RoundsPlayed,
    int BookingsCount,
    decimal TotalSpend,
    double? HandicapIndex,
    int? BestRoundScore
);

public record HandicapBucket(
    string RangeLabel,
    int Count,
    double Percentage
);

public record ScoreDistribution(
    int EaglesOrBetter,
    int Birdies,
    int Pars,
    int Bogeys,
    int DoubleBogeysOrWorse
);

public record GolfersReportResponse(
    int TotalUniqueGolfers,
    int TotalRoundsPlayed,
    int Rounds9Hole,
    int Rounds18Hole,
    double AverageRoundScore,
    double AverageScoreToPar,
    int TotalRegisteredMembers,
    List<TopGolferDto> TopGolfers,
    List<HandicapBucket> HandicapDistribution,
    ScoreDistribution ScoringBreakdown
);

public record BayPerformanceDto(
    Guid BayId,
    int BayNumber,
    string BayName,
    bool IsOutdoor,
    bool HasLaunchMonitor,
    decimal HourlyRate,
    int SessionsCount,
    double TotalHours,
    decimal TotalRevenue,
    double UtilizationPercent
);

public record TournamentPerformanceDto(
    Guid Id,
    string Name,
    string Format,
    string Status,
    DateTime StartDate,
    DateTime EndDate,
    int ParticipantsCount,
    int MaxParticipants,
    decimal EntryFee,
    decimal RevenueCollected,
    decimal PrizePurse,
    string? ClosestToPinWinner,
    string? LongestDriveWinner
);

public record RangeTournamentsReportResponse(
    // Range KPIs
    int TotalRangeSessions,
    decimal TotalRangeRevenue,
    double TotalPracticeHours,
    double AverageSessionDurationMinutes,

    // Range Features Split
    int TrackManSessions,
    decimal TrackManRevenue,
    int StandardSessions,
    decimal StandardRevenue,

    // Tournament KPIs
    int TotalTournaments,
    int TotalParticipants,
    decimal TotalTournamentRevenue,
    decimal TotalPrizePurse,

    // Details Lists
    List<BayPerformanceDto> Bays,
    List<TournamentPerformanceDto> Tournaments
);

// ── Controller ────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/tenants/{tenantId:guid}/reports")]
[Authorize(Roles = "CourseAdmin,SuperAdmin")]   // Owner-only
[TenantScoped]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    // GET /api/tenants/{tenantId}/reports/revenue?days=30
    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueReportResponse>> Revenue(
        Guid tenantId,
        [FromQuery] int days = 30)
    {
        if (days is < 1 or > 365)
            return BadRequest("days must be between 1 and 365.");

        var now      = DateTime.UtcNow.Date;
        var start    = now.AddDays(-days);
        var prevStart = start.AddDays(-days);  // same-length prior period

        // ── Tee bookings (current period) ────────────────────────────────────
        var teeBookings = await _db.Bookings
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId
                     && b.TeeSlot!.StartTime >= start
                     && b.TeeSlot!.StartTime < now.AddDays(1))
            .ToListAsync();

        // ── Tee bookings (previous period) ───────────────────────────────────
        var teePrev = await _db.Bookings
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId
                     && b.TeeSlot!.StartTime >= prevStart
                     && b.TeeSlot!.StartTime < start)
            .SumAsync(b => b.AmountPaid);

        // ── Range bookings (current period) ──────────────────────────────────
        var rangeBookings = await _db.BayBookings
            .Where(b => b.TenantId == tenantId
                     && b.StartTime >= start
                     && b.StartTime < now.AddDays(1)
                     && b.Status != BayBookingStatus.Cancelled)
            .ToListAsync();

        // ── Range bookings (previous period) ─────────────────────────────────
        var rangePrev = await _db.BayBookings
            .Where(b => b.TenantId == tenantId
                     && b.StartTime >= prevStart
                     && b.StartTime < start
                     && b.Status != BayBookingStatus.Cancelled)
            .SumAsync(b => b.AmountPaid);

        // ── Occupancy: total available slots vs booked ────────────────────────
        var totalSlots = await _db.TeeSlots
            .Where(t => t.TenantId == tenantId
                     && t.StartTime >= start
                     && t.StartTime < now.AddDays(1)
                     && !t.IsBlocked)
            .CountAsync();

        // ── Aggregate KPIs ────────────────────────────────────────────────────
        var nonCancelledTee = teeBookings.Where(b => b.Status != BookingStatus.Cancelled).ToList();
        decimal teeRev  = nonCancelledTee.Sum(b => b.AmountPaid);
        decimal rangeRev = rangeBookings.Sum(b => b.AmountPaid);

        int checkedIn  = teeBookings.Count(b => b.Status == BookingStatus.CheckedIn);
        int cancelled  = teeBookings.Count(b => b.Status == BookingStatus.Cancelled);
        double avgParty = nonCancelledTee.Count > 0
            ? nonCancelledTee.Average(b => b.PartySize)
            : 0;

        double occupancy = totalSlots > 0
            ? Math.Round(nonCancelledTee.Count * 100.0 / totalSlots, 1)
            : 0;

        // ── Daily chart: group by date ─────────────────────────────────────────
        // Build a day-by-day index for the period
        var days_range = Enumerable.Range(0, days)
            .Select(i => start.AddDays(i))
            .ToList();

        var teeByDay = teeBookings
            .Where(b => b.Status != BookingStatus.Cancelled)
            .GroupBy(b => b.TeeSlot!.StartTime.Date)
            .ToDictionary(g => g.Key, g => g.Sum(b => b.AmountPaid));

        var rangeByDay = rangeBookings
            .GroupBy(b => b.StartTime.Date)
            .ToDictionary(g => g.Key, g => g.Sum(b => b.AmountPaid));

        var daily = days_range.Select(d => new DailyRevenuePoint(
            d.ToString("yyyy-MM-dd"),
            teeByDay.TryGetValue(d, out var t) ? t : 0m,
            rangeByDay.TryGetValue(d, out var r) ? r : 0m
        )).ToList();

        return Ok(new RevenueReportResponse(
            TotalRevenue: teeRev + rangeRev,
            TeeRevenue: teeRev,
            RangeRevenue: rangeRev,
            PreviousPeriodRevenue: teePrev + rangePrev,
            PreviousTeePeriodRevenue: teePrev,
            PreviousRangePeriodRevenue: rangePrev,
            TotalBookings: teeBookings.Count,
            CheckedIn: checkedIn,
            Cancelled: cancelled,
            OccupancyPercent: occupancy,
            AveragePartySize: Math.Round(avgParty, 1),
            Daily: daily
        ));
    }

    // GET /api/tenants/{tenantId}/reports/tee-sheet?days=30
    [HttpGet("tee-sheet")]
    public async Task<ActionResult<TeeSheetReportResponse>> TeeSheet(
        Guid tenantId,
        [FromQuery] int days = 30)
    {
        if (days is < 1 or > 365)
            return BadRequest("days must be between 1 and 365.");

        var now = DateTime.UtcNow.Date;
        var start = now.AddDays(-days);

        // Fetch all non-blocked slots for the period with their bookings
        var slots = await _db.TeeSlots
            .Include(t => t.Bookings)
            .Where(t => t.TenantId == tenantId
                     && t.StartTime >= start
                     && t.StartTime < now.AddDays(1)
                     && !t.IsBlocked)
            .ToListAsync();

        var allBookings = await _db.Bookings
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId
                     && b.TeeSlot!.StartTime >= start
                     && b.TeeSlot!.StartTime < now.AddDays(1))
            .ToListAsync();

        var nonCancelledBookings = allBookings.Where(b => b.Status != BookingStatus.Cancelled).ToList();

        int totalSlots = slots.Count;
        int bookedSlots = slots.Count(s => s.Bookings.Any(b => b.Status != BookingStatus.Cancelled));
        int totalGolfers = nonCancelledBookings.Sum(b => b.PartySize);
        int maxPossibleCapacity = slots.Sum(s => s.MaxPlayers);

        double overallOccupancy = maxPossibleCapacity > 0
            ? Math.Round((double)totalGolfers * 100.0 / maxPossibleCapacity, 1)
            : (totalSlots > 0 ? Math.Round((double)bookedSlots * 100.0 / totalSlots, 1) : 0);

        // Weekday vs Weekend breakdown
        var weekdaySlots = slots.Where(s => s.StartTime.DayOfWeek != DayOfWeek.Saturday && s.StartTime.DayOfWeek != DayOfWeek.Sunday).ToList();
        var weekendSlots = slots.Where(s => s.StartTime.DayOfWeek == DayOfWeek.Saturday || s.StartTime.DayOfWeek == DayOfWeek.Sunday).ToList();

        int weekdayGolfers = weekdaySlots.SelectMany(s => s.Bookings.Where(b => b.Status != BookingStatus.Cancelled)).Sum(b => b.PartySize);
        int weekendGolfers = weekendSlots.SelectMany(s => s.Bookings.Where(b => b.Status != BookingStatus.Cancelled)).Sum(b => b.PartySize);
        int weekdayCapacity = weekdaySlots.Sum(s => s.MaxPlayers);
        int weekendCapacity = weekendSlots.Sum(s => s.MaxPlayers);

        double weekdayOccupancy = weekdayCapacity > 0 ? Math.Round((double)weekdayGolfers * 100.0 / weekdayCapacity, 1) : 0;
        double weekendOccupancy = weekendCapacity > 0 ? Math.Round((double)weekendGolfers * 100.0 / weekendCapacity, 1) : 0;

        int checkedInCount = allBookings.Count(b => b.Status == BookingStatus.CheckedIn);
        int cancelledCount = allBookings.Count(b => b.Status == BookingStatus.Cancelled);
        double checkInRate = allBookings.Count > 0 ? Math.Round((double)checkedInCount * 100.0 / allBookings.Count, 1) : 0;
        double cancellationRate = allBookings.Count > 0 ? Math.Round((double)cancelledCount * 100.0 / allBookings.Count, 1) : 0;
        double avgPartySize = nonCancelledBookings.Count > 0 ? Math.Round(nonCancelledBookings.Average(b => b.PartySize), 1) : 0;

        // ── Hourly Heatmap (6:00 to 18:00) ──────────────────────────────────
        var hourlyList = new List<HourlyDistribution>();
        for (int h = 6; h <= 18; h++)
        {
            var hSlots = slots.Where(s => s.StartTime.Hour == h).ToList();
            var hBookings = hSlots.SelectMany(s => s.Bookings.Where(b => b.Status != BookingStatus.Cancelled)).ToList();
            int hGolfers = hBookings.Sum(b => b.PartySize);
            int hCap = hSlots.Sum(s => s.MaxPlayers);
            double hOcc = hCap > 0 ? Math.Round((double)hGolfers * 100.0 / hCap, 1) : 0;
            decimal hRev = hBookings.Sum(b => b.AmountPaid > 0 ? b.AmountPaid : (b.PartySize * (b.TeeSlot?.Price ?? 0)));

            string hourLabel = h == 12 ? "12 PM" : h > 12 ? $"{h - 12} PM" : $"{h} AM";
            hourlyList.Add(new HourlyDistribution(
                Hour: h,
                HourLabel: hourLabel,
                TotalSlots: hSlots.Count,
                BookedSlots: hSlots.Count(s => s.Bookings.Any(b => b.Status != BookingStatus.Cancelled)),
                TotalGolfers: hGolfers,
                OccupancyPercent: hOcc,
                Revenue: hRev
            ));
        }

        // ── Time of Day Buckets ──────────────────────────────────────────────
        var buckets = new List<(string Name, string Range, int StartHour, int EndHour)>
        {
            ("Morning Rush", "6:00 AM – 9:00 AM", 6, 8),
            ("Midday Prime", "9:00 AM – 1:00 PM", 9, 12),
            ("Afternoon", "1:00 PM – 4:00 PM", 13, 15),
            ("Twilight", "4:00 PM – 7:00 PM", 16, 18)
        };

        var timeOfDayList = new List<TimeOfDayBucket>();
        foreach (var b in buckets)
        {
            var bSlots = slots.Where(s => s.StartTime.Hour >= b.StartHour && s.StartTime.Hour <= b.EndHour).ToList();
            var bBookings = bSlots.SelectMany(s => s.Bookings.Where(bk => bk.Status != BookingStatus.Cancelled)).ToList();
            int bGolfers = bBookings.Sum(bk => bk.PartySize);
            int bCap = bSlots.Sum(s => s.MaxPlayers);
            double bOcc = bCap > 0 ? Math.Round((double)bGolfers * 100.0 / bCap, 1) : 0;
            decimal bRev = bBookings.Sum(bk => bk.AmountPaid > 0 ? bk.AmountPaid : (bk.PartySize * (bk.TeeSlot?.Price ?? 0)));

            timeOfDayList.Add(new TimeOfDayBucket(
                Name: b.Name,
                TimeRange: b.Range,
                TotalSlots: bSlots.Count,
                BookedSlots: bSlots.Count(s => s.Bookings.Any(bk => bk.Status != BookingStatus.Cancelled)),
                TotalGolfers: bGolfers,
                OccupancyPercent: bOcc,
                Revenue: bRev
            ));
        }

        // ── Day of Week Distribution (Mon to Sun) ────────────────────────────
        var daysOrder = new List<(DayOfWeek Dow, string Name, string ShortName)>
        {
            (DayOfWeek.Monday, "Monday", "Mon"),
            (DayOfWeek.Tuesday, "Tuesday", "Tue"),
            (DayOfWeek.Wednesday, "Wednesday", "Wed"),
            (DayOfWeek.Thursday, "Thursday", "Thu"),
            (DayOfWeek.Friday, "Friday", "Fri"),
            (DayOfWeek.Saturday, "Saturday", "Sat"),
            (DayOfWeek.Sunday, "Sunday", "Sun")
        };

        var dowList = new List<DayOfWeekDistribution>();
        foreach (var d in daysOrder)
        {
            var dSlots = slots.Where(s => s.StartTime.DayOfWeek == d.Dow).ToList();
            var dBookings = dSlots.SelectMany(s => s.Bookings.Where(bk => bk.Status != BookingStatus.Cancelled)).ToList();
            int dGolfers = dBookings.Sum(bk => bk.PartySize);
            int dCap = dSlots.Sum(s => s.MaxPlayers);
            double dOcc = dCap > 0 ? Math.Round((double)dGolfers * 100.0 / dCap, 1) : 0;
            decimal dRev = dBookings.Sum(bk => bk.AmountPaid > 0 ? bk.AmountPaid : (bk.PartySize * (bk.TeeSlot?.Price ?? 0)));

            dowList.Add(new DayOfWeekDistribution(
                Day: d.Name,
                ShortDay: d.ShortName,
                TotalSlots: dSlots.Count,
                BookedSlots: dSlots.Count(s => s.Bookings.Any(bk => bk.Status != BookingStatus.Cancelled)),
                TotalGolfers: dGolfers,
                OccupancyPercent: dOcc,
                Revenue: dRev
            ));
        }

        return Ok(new TeeSheetReportResponse(
            TotalSlots: totalSlots,
            BookedSlots: bookedSlots,
            TotalGolfers: totalGolfers,
            OverallOccupancyPercent: overallOccupancy,
            WeekdayOccupancyPercent: weekdayOccupancy,
            WeekendOccupancyPercent: weekendOccupancy,
            CheckInRate: checkInRate,
            CancellationRate: cancellationRate,
            AveragePartySize: avgPartySize,
            Hourly: hourlyList,
            TimeOfDay: timeOfDayList,
            DaysOfWeek: dowList
        ));
    }

    // GET /api/tenants/{tenantId}/reports/golfers?days=30
    [HttpGet("golfers")]
    public async Task<ActionResult<GolfersReportResponse>> Golfers(
        Guid tenantId,
        [FromQuery] int days = 30)
    {
        if (days is < 1 or > 365)
            return BadRequest("days must be between 1 and 365.");

        var now = DateTime.UtcNow.Date;
        var start = now.AddDays(-days);

        // 1. Fetch rounds played at this course in period
        var rounds = await _db.Rounds
            .IgnoreQueryFilters()
            .Include(r => r.User)
            .Include(r => r.Holes)
            .Where(r => r.TenantId == tenantId && r.PlayedOn >= start && r.PlayedOn < now.AddDays(1))
            .ToListAsync();

        // 2. Fetch tee bookings in period
        var bookings = await _db.Bookings
            .IgnoreQueryFilters()
            .Include(b => b.User)
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId
                     && b.TeeSlot!.StartTime >= start
                     && b.TeeSlot.StartTime < now.AddDays(1)
                     && b.Status != BookingStatus.Cancelled)
            .ToListAsync();

        // 3. Fetch registered golfers for this course
        var members = await _db.Users
            .Where(u => u.TenantId == tenantId && u.Role == AppRole.Golfer)
            .ToListAsync();

        int totalRounds = rounds.Count;
        int rounds9 = rounds.Count(r => r.Holes.Count > 0 && r.Holes.Count <= 9);
        int rounds18 = rounds.Count(r => r.Holes.Count > 9);

        // Average score calculations
        var roundsWithScores = rounds.Where(r => r.Holes.Count > 0).ToList();
        double avgScore = 0;
        double avgScoreToPar = 0;

        if (roundsWithScores.Count > 0)
        {
            var normalizedScores = roundsWithScores.Select(r =>
            {
                int totalStrokes = r.Holes.Sum(h => h.Strokes);
                int totalPar = r.Holes.Sum(h => h.Par);
                // Scale 9-hole score up to 18-hole equivalent for fair aggregate comparison
                if (r.Holes.Count <= 9 && r.Holes.Count > 0)
                {
                    totalStrokes = (int)Math.Round(totalStrokes * (18.0 / r.Holes.Count));
                    totalPar = (int)Math.Round(totalPar * (18.0 / r.Holes.Count));
                }
                return new { Strokes = totalStrokes, Diff = totalStrokes - totalPar };
            }).ToList();

            avgScore = Math.Round(normalizedScores.Average(s => s.Strokes), 1);
            avgScoreToPar = Math.Round(normalizedScores.Average(s => s.Diff), 1);
        }

        // Unique golfers in period
        var roundUserIds = rounds.Select(r => r.UserId);
        var bookingUserIds = bookings.Select(b => b.UserId);
        var uniqueUserIds = roundUserIds.Concat(bookingUserIds).Distinct().ToList();

        // Top 10 Golfers Leaderboard
        var topGolfers = new List<TopGolferDto>();
        foreach (var uid in uniqueUserIds)
        {
            var user = rounds.FirstOrDefault(r => r.UserId == uid)?.User
                    ?? bookings.FirstOrDefault(b => b.UserId == uid)?.User
                    ?? members.FirstOrDefault(m => m.Id == uid);

            if (user == null) continue;

            int uRounds = rounds.Count(r => r.UserId == uid);
            int uBookings = bookings.Count(b => b.UserId == uid);
            decimal uSpend = bookings.Where(b => b.UserId == uid).Sum(b => b.AmountPaid > 0 ? b.AmountPaid : b.PartySize * (b.TeeSlot?.Price ?? 0));

            var uRoundScores = rounds.Where(r => r.UserId == uid && r.Holes.Count >= 9)
                .Select(r => r.Holes.Sum(h => h.Strokes))
                .ToList();
            int? bestScore = uRoundScores.Count > 0 ? uRoundScores.Min() : null;

            string fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = user.UserName ?? "Golfer";

            topGolfers.Add(new TopGolferDto(
                UserId: uid,
                Name: fullName,
                Email: user.Email ?? string.Empty,
                AvatarUrl: user.AvatarUrl,
                RoundsPlayed: uRounds,
                BookingsCount: uBookings,
                TotalSpend: uSpend,
                HandicapIndex: user.HandicapIndex,
                BestRoundScore: bestScore
            ));
        }

        // Sort by total spend and rounds played
        topGolfers = topGolfers
            .OrderByDescending(g => g.TotalSpend)
            .ThenByDescending(g => g.RoundsPlayed)
            .Take(10)
            .ToList();

        // Handicap distribution across active members & golfers
        var allGolfers = members
            .Concat(rounds.Where(r => r.User != null).Select(r => r.User!))
            .Concat(bookings.Where(b => b.User != null).Select(b => b.User!))
            .Where(u => u != null)
            .GroupBy(u => u.Id)
            .Select(g => g.First())
            .ToList();

        int totalGolferCount = Math.Max(allGolfers.Count, 1);
        var handicapBuckets = new List<HandicapBucket>
        {
            new HandicapBucket("+ / Scratch (≤ 0)", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value <= 0), 0),
            new HandicapBucket("1.0 – 5.0", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value > 0 && g.HandicapIndex.Value <= 5.0), 0),
            new HandicapBucket("5.1 – 10.0", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value > 5.0 && g.HandicapIndex.Value <= 10.0), 0),
            new HandicapBucket("10.1 – 18.0", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value > 10.0 && g.HandicapIndex.Value <= 18.0), 0),
            new HandicapBucket("18.1 – 28.0", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value > 18.0 && g.HandicapIndex.Value <= 28.0), 0),
            new HandicapBucket("28.1+", allGolfers.Count(g => g?.HandicapIndex.HasValue == true && g.HandicapIndex.Value > 28.0), 0),
            new HandicapBucket("Unranked / Pending", allGolfers.Count(g => g == null || !g.HandicapIndex.HasValue), 0)
        };

        handicapBuckets = handicapBuckets
            .Select(b => b with { Percentage = Math.Round((double)b.Count * 100.0 / totalGolferCount, 1) })
            .ToList();

        // Hole Scoring Breakdown
        var allHoles = rounds.SelectMany(r => r.Holes).ToList();
        int eagles = allHoles.Count(h => h.Strokes <= h.Par - 2);
        int birdies = allHoles.Count(h => h.Strokes == h.Par - 1);
        int pars = allHoles.Count(h => h.Strokes == h.Par);
        int bogeys = allHoles.Count(h => h.Strokes == h.Par + 1);
        int doubles = allHoles.Count(h => h.Strokes >= h.Par + 2);

        var scoringBreakdown = new ScoreDistribution(
            EaglesOrBetter: eagles,
            Birdies: birdies,
            Pars: pars,
            Bogeys: bogeys,
            DoubleBogeysOrWorse: doubles
        );

        return Ok(new GolfersReportResponse(
            TotalUniqueGolfers: uniqueUserIds.Count,
            TotalRoundsPlayed: totalRounds,
            Rounds9Hole: rounds9,
            Rounds18Hole: rounds18,
            AverageRoundScore: avgScore,
            AverageScoreToPar: avgScoreToPar,
            TotalRegisteredMembers: members.Count,
            TopGolfers: topGolfers,
            HandicapDistribution: handicapBuckets,
            ScoringBreakdown: scoringBreakdown
        ));
    }

    // GET /api/tenants/{tenantId}/reports/range-tournaments?days=30
    [HttpGet("range-tournaments")]
    public async Task<ActionResult<RangeTournamentsReportResponse>> RangeAndTournaments(
        Guid tenantId,
        [FromQuery] int days = 30)
    {
        if (days is < 1 or > 365)
            return BadRequest("days must be between 1 and 365.");

        var now = DateTime.UtcNow.Date;
        var start = now.AddDays(-days);

        // 1. Range Bays & Bookings
        var bays = await _db.RangeBays
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .OrderBy(b => b.BayNumber)
            .ToListAsync();

        var bayBookings = await _db.BayBookings
            .IgnoreQueryFilters()
            .Include(b => b.RangeBay)
            .Where(b => b.TenantId == tenantId
                     && b.StartTime >= start
                     && b.StartTime < now.AddDays(1)
                     && b.Status != BayBookingStatus.Cancelled)
            .ToListAsync();

        int totalRangeSessions = bayBookings.Count;
        decimal totalRangeRevenue = bayBookings.Sum(b => b.AmountPaid > 0 ? b.AmountPaid : b.Price);
        double totalPracticeMinutes = bayBookings.Sum(b => b.DurationMinutes);
        double totalPracticeHours = Math.Round(totalPracticeMinutes / 60.0, 1);
        double avgDuration = totalRangeSessions > 0 ? Math.Round(totalPracticeMinutes / totalRangeSessions, 0) : 60;

        var trackmanBookings = bayBookings.Where(b => b.RangeBay?.HasLaunchMonitor == true).ToList();
        var standardBookings = bayBookings.Where(b => b.RangeBay?.HasLaunchMonitor != true).ToList();

        int trackmanSessions = trackmanBookings.Count;
        decimal trackmanRevenue = trackmanBookings.Sum(b => b.AmountPaid > 0 ? b.AmountPaid : b.Price);

        int standardSessions = standardBookings.Count;
        decimal standardRevenue = standardBookings.Sum(b => b.AmountPaid > 0 ? b.AmountPaid : b.Price);

        // Bay-by-bay performance list
        // Assume 12 operating hours per day (e.g. 7 AM to 7 PM)
        double totalOperatingHoursPerBay = Math.Max(days * 12.0, 1.0);

        var bayPerformance = bays.Select(bay =>
        {
            var bBookings = bayBookings.Where(bk => bk.RangeBayId == bay.Id).ToList();
            int sessions = bBookings.Count;
            double hours = Math.Round(bBookings.Sum(bk => bk.DurationMinutes) / 60.0, 1);
            decimal rev = bBookings.Sum(bk => bk.AmountPaid > 0 ? bk.AmountPaid : bk.Price);
            double util = Math.Round((hours / totalOperatingHoursPerBay) * 100.0, 1);

            return new BayPerformanceDto(
                BayId: bay.Id,
                BayNumber: bay.BayNumber,
                BayName: bay.Name,
                IsOutdoor: bay.IsOutdoor,
                HasLaunchMonitor: bay.HasLaunchMonitor,
                HourlyRate: bay.HourlyRate,
                SessionsCount: sessions,
                TotalHours: hours,
                TotalRevenue: rev,
                UtilizationPercent: util
            );
        }).ToList();

        // 2. Tournaments
        var tournaments = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .Where(t => t.TenantId == tenantId
                     && t.StartDate >= start.AddMonths(-1) // include recently started/completed tournaments
                     && t.Status != TournamentStatus.Cancelled)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();

        int totalTournaments = tournaments.Count;
        int totalParticipants = tournaments.Sum(t => t.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn));
        decimal totalTournamentRevenue = tournaments.Sum(t => t.Registrations.Where(r => r.Status != TournamentRegistrationStatus.Withdrawn).Sum(r => r.AmountPaid > 0 ? r.AmountPaid : t.EntryFee));
        decimal totalPrizePurse = tournaments.Sum(t => t.PrizePurse);

        var tournamentDtos = tournaments.Select(t =>
        {
            int pCount = t.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn);
            decimal rev = t.Registrations.Where(r => r.Status != TournamentRegistrationStatus.Withdrawn).Sum(r => r.AmountPaid > 0 ? r.AmountPaid : t.EntryFee);

            return new TournamentPerformanceDto(
                Id: t.Id,
                Name: t.Name,
                Format: t.Format.ToString(),
                Status: t.Status.ToString(),
                StartDate: t.StartDate,
                EndDate: t.EndDate,
                ParticipantsCount: pCount,
                MaxParticipants: t.MaxParticipants,
                EntryFee: t.EntryFee,
                RevenueCollected: rev,
                PrizePurse: t.PrizePurse,
                ClosestToPinWinner: t.ClosestToPinWinner,
                LongestDriveWinner: t.LongestDriveWinner
            );
        }).ToList();

        return Ok(new RangeTournamentsReportResponse(
            TotalRangeSessions: totalRangeSessions,
            TotalRangeRevenue: totalRangeRevenue,
            TotalPracticeHours: totalPracticeHours,
            AverageSessionDurationMinutes: avgDuration,
            TrackManSessions: trackmanSessions,
            TrackManRevenue: trackmanRevenue,
            StandardSessions: standardSessions,
            StandardRevenue: standardRevenue,
            TotalTournaments: totalTournaments,
            TotalParticipants: totalParticipants,
            TotalTournamentRevenue: totalTournamentRevenue,
            TotalPrizePurse: totalPrizePurse,
            Bays: bayPerformance,
            Tournaments: tournamentDtos
        ));
    }
}
