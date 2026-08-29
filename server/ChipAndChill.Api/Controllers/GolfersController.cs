using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}/golfers")]
[Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
public class GolfersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public GolfersController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    // GET /api/tenants/{tenantId}/golfers?search=...
    [HttpGet]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<IEnumerable<TenantGolferSummaryDto>>> GetGolfers(
        [FromRoute] Guid tenantId,
        [FromQuery] string? search)
    {
        // Strict Tenant Isolation: Only return golfers who are:
        // 1. Registered directly under this tenant (u.TenantId == tenantId), OR
        // 2. Have booked tee times at this tenant, OR
        // 3. Have registered for tournaments at this tenant, OR
        // 4. Have reserved driving range bays at this tenant, OR
        // 5. Have played/recorded rounds at this tenant.

        var tournamentRegs = await _db.TournamentRegistrations
            .Include(r => r.Tournament)
            .Where(r => r.Tournament != null && r.Tournament.TenantId == tenantId)
            .ToListAsync();

        var rangeBookings = await _db.BayBookings
            .Include(b => b.RangeBay)
            .Where(b => b.TenantId == tenantId)
            .ToListAsync();

        var userRounds = await _db.Rounds
            .Where(r => r.TenantId == tenantId)
            .ToListAsync();

        var userBookings = await _db.Bookings
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId)
            .ToListAsync();

        // Collect all distinct UserIds associated with this tenant
        var activeUserIds = new HashSet<Guid>();

        foreach (var b in userBookings) activeUserIds.Add(b.UserId);
        foreach (var r in userRounds) activeUserIds.Add(r.UserId);
        foreach (var t in tournamentRegs) { if (t.UserId.HasValue) activeUserIds.Add(t.UserId.Value); }
        foreach (var rb in rangeBookings) { if (rb.UserId.HasValue) activeUserIds.Add(rb.UserId.Value); }

        var tournamentEmails = new HashSet<string>(
            tournamentRegs.Where(t => !string.IsNullOrWhiteSpace(t.GolferEmail)).Select(t => t.GolferEmail.ToLower()),
            StringComparer.OrdinalIgnoreCase
        );

        var rangeEmails = new HashSet<string>(
            rangeBookings.Where(b => !string.IsNullOrWhiteSpace(b.GolferEmail)).Select(b => b.GolferEmail.ToLower()),
            StringComparer.OrdinalIgnoreCase
        );

        // Query users who belong to this tenant or have active IDs/emails at this tenant
        var users = await _userManager.Users
            .Where(u => u.TenantId == tenantId ||
                        activeUserIds.Contains(u.Id) ||
                        (u.Email != null && (tournamentEmails.Contains(u.Email.ToLower()) || rangeEmails.Contains(u.Email.ToLower()))))
            .ToListAsync();

        var list = new List<TenantGolferSummaryDto>();
        var processedEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // A. Process tenant-affiliated registered accounts
        foreach (var u in users)
        {
            if (!string.IsNullOrWhiteSpace(u.Email))
                processedEmails.Add(u.Email);

            var myBookings = userBookings.Where(b => b.UserId == u.Id).ToList();
            var myTournaments = tournamentRegs.Where(r => (r.UserId == u.Id) || (!string.IsNullOrWhiteSpace(u.Email) && string.Equals(r.GolferEmail, u.Email, StringComparison.OrdinalIgnoreCase))).ToList();
            var myRange = rangeBookings.Where(b => (b.UserId == u.Id) || (!string.IsNullOrWhiteSpace(u.Email) && string.Equals(b.GolferEmail, u.Email, StringComparison.OrdinalIgnoreCase))).ToList();
            var myRounds = userRounds.Where(r => r.UserId == u.Id).ToList();

            var bookingSpend = myBookings
                .Where(b => b.Status != BookingStatus.Cancelled)
                .Sum(b => b.TeeSlot != null ? b.TeeSlot.Price * b.PartySize : b.AmountPaid);

            var tournamentSpend = myTournaments
                .Where(r => r.PaymentStatus == TournamentPaymentStatus.Paid)
                .Sum(r => r.AmountPaid);

            var rangeSpend = myRange
                .Where(b => b.Status != BayBookingStatus.Cancelled)
                .Sum(b => b.Price);

            var totalSpend = bookingSpend + tournamentSpend + rangeSpend;

            var activityDates = new List<DateTime>();
            if (myBookings.Any()) activityDates.Add(myBookings.Max(b => b.CreatedAt));
            if (myTournaments.Any()) activityDates.Add(myTournaments.Max(r => r.RegisteredAt));
            if (myRange.Any()) activityDates.Add(myRange.Max(b => b.CreatedAt));
            if (myRounds.Any()) activityDates.Add(myRounds.Max(r => r.PlayedOn));
            activityDates.Add(u.CreatedAt);

            var lastActivity = activityDates.Max();

            list.Add(new TenantGolferSummaryDto(
                u.Id,
                u.Email ?? string.Empty,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.HandicapIndex,
                u.CreatedAt,
                myBookings.Count,
                myTournaments.Count,
                myRange.Count,
                myRounds.Count,
                totalSpend,
                lastActivity,
                u.AvatarUrl,
                u.City,
                u.HomeClubName,
                u.PreferredTee
            ));
        }

        // B. Process guest golfers who entered tournaments at this tenant
        foreach (var tReg in tournamentRegs)
        {
            if (string.IsNullOrWhiteSpace(tReg.GolferEmail) || processedEmails.Contains(tReg.GolferEmail))
                continue;

            processedEmails.Add(tReg.GolferEmail);

            var myTournaments = tournamentRegs.Where(r => string.Equals(r.GolferEmail, tReg.GolferEmail, StringComparison.OrdinalIgnoreCase)).ToList();
            var myRange = rangeBookings.Where(b => string.Equals(b.GolferEmail, tReg.GolferEmail, StringComparison.OrdinalIgnoreCase)).ToList();

            var tournamentSpend = myTournaments.Where(r => r.PaymentStatus == TournamentPaymentStatus.Paid).Sum(r => r.AmountPaid);
            var rangeSpend = myRange.Where(b => b.Status != BayBookingStatus.Cancelled).Sum(b => b.Price);

            var names = (tReg.GolferName ?? "Guest Golfer").Split(' ', 2);
            var fName = names.Length > 0 ? names[0] : "Guest";
            var lName = names.Length > 1 ? names[1] : "Golfer";

            list.Add(new TenantGolferSummaryDto(
                tReg.Id,
                tReg.GolferEmail,
                fName,
                lName,
                null,
                (double?)tReg.HandicapIndex,
                tReg.RegisteredAt,
                0,
                myTournaments.Count,
                myRange.Count,
                0,
                tournamentSpend + rangeSpend,
                tReg.RegisteredAt
            ));
        }

        // Search filtering
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            list = list.Where(g =>
                g.FirstName.ToLower().Contains(s) ||
                g.LastName.ToLower().Contains(s) ||
                g.Email.ToLower().Contains(s) ||
                (g.PhoneNumber != null && g.PhoneNumber.Contains(s))
            ).ToList();
        }

        return Ok(list.OrderByDescending(g => g.LastActivityAt ?? DateTime.MinValue));
    }

    // GET /api/tenants/{tenantId}/golfers/{userId}
    [HttpGet("{userId:guid}")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<TenantGolferDetailDto>> GetGolferDetail(
        [FromRoute] Guid tenantId,
        [FromRoute] Guid userId)
    {
        var u = await _userManager.FindByIdAsync(userId.ToString());

        var myBookings = await _db.Bookings
            .Include(b => b.TeeSlot)
            .Where(b => b.TenantId == tenantId && b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Take(10)
            .ToListAsync();

        var userEmail = u?.Email;

        var myTournaments = await _db.TournamentRegistrations
            .Include(r => r.Tournament)
            .Where(r => r.Tournament != null && r.Tournament.TenantId == tenantId && (r.UserId == userId || (userEmail != null && r.GolferEmail.ToLower() == userEmail.ToLower()) || r.Id == userId))
            .OrderByDescending(r => r.RegisteredAt)
            .Take(10)
            .ToListAsync();

        var myRange = await _db.BayBookings
            .Include(b => b.RangeBay)
            .Where(b => b.TenantId == tenantId && (b.UserId == userId || (userEmail != null && b.GolferEmail.ToLower() == userEmail.ToLower())))
            .OrderByDescending(b => b.CreatedAt)
            .Take(10)
            .ToListAsync();

        var myRounds = await _db.Rounds
            .Where(r => r.TenantId == tenantId && r.UserId == userId)
            .ToListAsync();

        // Strict tenant verification: Golfer must have a relationship with this tenant
        var isTenantMember = u != null && u.TenantId == tenantId;
        var hasActivityAtTenant = myBookings.Any() || myTournaments.Any() || myRange.Any() || myRounds.Any();

        if (!isTenantMember && !hasActivityAtTenant && u != null)
        {
            return NotFound(new { message = "Golfer has no records at this course." });
        }

        var bookingSpend = myBookings
            .Where(b => b.Status != BookingStatus.Cancelled)
            .Sum(b => b.TeeSlot != null ? b.TeeSlot.Price * b.PartySize : b.AmountPaid);

        var tournamentSpend = myTournaments
            .Where(r => r.PaymentStatus == TournamentPaymentStatus.Paid)
            .Sum(r => r.AmountPaid);

        var rangeSpend = myRange
            .Where(b => b.Status != BayBookingStatus.Cancelled)
            .Sum(b => b.Price);

        var totalSpend = bookingSpend + tournamentSpend + rangeSpend;

        var activityDates = new List<DateTime>();
        if (myBookings.Any()) activityDates.Add(myBookings.Max(b => b.CreatedAt));
        if (myTournaments.Any()) activityDates.Add(myTournaments.Max(r => r.RegisteredAt));
        if (myRange.Any()) activityDates.Add(myRange.Max(b => b.CreatedAt));
        if (myRounds.Any()) activityDates.Add(myRounds.Max(r => r.PlayedOn));
        if (u != null) activityDates.Add(u.CreatedAt);

        var lastActivity = activityDates.Any() ? activityDates.Max() : DateTime.UtcNow;

        var recentBookingsDto = myBookings.Select(b => new TenantGolferRecentBookingDto(
            b.Id,
            b.TeeSlot?.StartTime.ToString("yyyy-MM-dd") ?? b.CreatedAt.ToString("yyyy-MM-dd"),
            b.TeeSlot?.StartTime.ToString("HH:mm") ?? "—",
            b.PartySize,
            b.Status.ToString(),
            b.TeeSlot != null ? b.TeeSlot.Price * b.PartySize : b.AmountPaid,
            b.PaymentStatus.ToString()
        )).ToList();

        var recentTournamentsDto = myTournaments.Select(r => new TenantGolferRecentTournamentDto(
            r.TournamentId,
            r.Tournament?.Name ?? "Tournament",
            r.Tournament?.Format.ToString() ?? "StrokePlay",
            r.Tournament?.StartDate.ToString("yyyy-MM-dd") ?? "—",
            r.Status.ToString(),
            r.PaymentStatus.ToString(),
            null,
            null
        )).ToList();

        var recentRangeDto = myRange.Select(b => new TenantGolferRecentRangeDto(
            b.Id,
            b.RangeBay?.Name ?? $"Bay {b.RangeBayId}",
            b.StartTime.ToString("yyyy-MM-dd HH:mm"),
            b.DurationMinutes,
            b.Status.ToString(),
            b.Price
        )).ToList();

        if (u == null && myTournaments.Any())
        {
            var firstT = myTournaments[0];
            var names = (firstT.GolferName ?? "Guest Golfer").Split(' ', 2);
            return Ok(new TenantGolferDetailDto(
                userId,
                firstT.GolferEmail,
                names.Length > 0 ? names[0] : "Guest",
                names.Length > 1 ? names[1] : "Golfer",
                null,
                (double?)firstT.HandicapIndex,
                firstT.RegisteredAt,
                0,
                myTournaments.Count,
                myRange.Count,
                0,
                totalSpend,
                lastActivity,
                recentBookingsDto,
                recentTournamentsDto,
                recentRangeDto
            ));
        }

        if (u == null)
        {
            return NotFound(new { message = "Golfer not found." });
        }

        return Ok(new TenantGolferDetailDto(
            u.Id,
            u.Email ?? string.Empty,
            u.FirstName,
            u.LastName,
            u.PhoneNumber,
            u.HandicapIndex,
            u.CreatedAt,
            myBookings.Count,
            myTournaments.Count,
            myRange.Count,
            myRounds.Count,
            totalSpend,
            lastActivity,
            recentBookingsDto,
            recentTournamentsDto,
            recentRangeDto,
            u.AvatarUrl,
            u.Bio,
            u.City,
            u.Country,
            u.HomeClubName,
            u.Handedness,
            u.PreferredTee,
            u.AverageScore,
            u.PlayFrequency,
            u.Driver,
            u.Irons,
            u.Putter,
            u.GolfBall,
            u.EmergencyContactName,
            u.EmergencyContactPhone,
            u.SmsAlertsEnabled,
            u.MarketingEnabled
        ));
    }

    // POST /api/tenants/{tenantId}/golfers
    [HttpPost]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<TenantGolferSummaryDto>> CreateGolfer(
        [FromRoute] Guid tenantId,
        [FromBody] CreateTenantGolferRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
        {
            return BadRequest(new { message = "First name, last name, and email are required." });
        }

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var existing = await _userManager.FindByEmailAsync(normalizedEmail);

        if (existing != null)
        {
            if (existing.Role == AppRole.Golfer)
            {
                if (existing.TenantId == null)
                {
                    existing.TenantId = tenantId;
                }
                if (req.HandicapIndex.HasValue)
                {
                    existing.HandicapIndex = req.HandicapIndex.Value;
                }
                if (!string.IsNullOrWhiteSpace(req.PhoneNumber))
                {
                    existing.PhoneNumber = req.PhoneNumber.Trim();
                }
                await _userManager.UpdateAsync(existing);

                return Ok(new TenantGolferSummaryDto(
                    existing.Id,
                    existing.Email ?? string.Empty,
                    existing.FirstName,
                    existing.LastName,
                    existing.PhoneNumber,
                    existing.HandicapIndex,
                    existing.CreatedAt,
                    0, 0, 0, 0, 0,
                    DateTime.UtcNow
                ));
            }

            return Conflict(new { message = "An account with this email already exists." });
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = normalizedEmail,
            Email = normalizedEmail,
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(req.PhoneNumber) ? null : req.PhoneNumber.Trim(),
            HandicapIndex = req.HandicapIndex,
            Role = AppRole.Golfer,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };

        var password = string.IsNullOrWhiteSpace(req.Password) ? "GolferPass123!" : req.Password.Trim();
        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
        }

        var summary = new TenantGolferSummaryDto(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.PhoneNumber,
            user.HandicapIndex,
            user.CreatedAt,
            0, 0, 0, 0, 0,
            user.CreatedAt
        );

        return CreatedAtAction(nameof(GetGolferDetail), new { tenantId, userId = user.Id }, summary);
    }

    // POST /api/tenants/{tenantId}/golfers/seed-demo
    [HttpPost("seed-demo")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult> SeedDemoGolfers([FromRoute] Guid tenantId)
    {
        var tenant = await _db.Tenants.FindAsync(tenantId);
        if (tenant == null) return NotFound("Tenant not found.");

        var seedList = new (string FirstName, string LastName, string Email, string Phone, double Handicap)[]
        {
            ("Scottie", "Scheffler", "scottie.scheffler@example.com", "+91 98111 00001", -2.4),
            ("Rory", "McIlroy", "rory.mcilroy@example.com", "+91 98111 00002", -1.8),
            ("Viktor", "Hovland", "viktor.hovland@example.com", "+91 98111 00003", 0.2),
            ("Brooks", "Koepka", "brooks.koepka@example.com", "+91 98111 00004", 0.8),
            ("Jon", "Rahm", "jon.rahm@example.com", "+91 98111 00005", -1.2),
            ("Collin", "Morikawa", "collin.morikawa@example.com", "+91 98111 00006", 1.4),
            ("Xander", "Schauffele", "xander.schauffele@example.com", "+91 98111 00007", -0.6),
            ("Jordan", "Spieth", "jordan.spieth@example.com", "+91 98111 00008", 1.9),
            ("Justin", "Thomas", "justin.thomas@example.com", "+91 98111 00009", 2.1),
            ("Matt", "Fitzpatrick", "matt.fitzpatrick@example.com", "+91 98111 00010", 2.5),
            ("Patrick", "Cantlay", "patrick.cantlay@example.com", "+91 98111 00011", 3.0),
            ("Max", "Homa", "max.homa@example.com", "+91 98111 00012", 3.4),
            ("Tony", "Finau", "tony.finau@example.com", "+91 98111 00013", 3.8),
            ("Wyndham", "Clark", "wyndham.clark@example.com", "+91 98111 00014", 4.2),
            ("Brian", "Harman", "brian.harman@example.com", "+91 98111 00015", 4.8),
            ("Keegan", "Bradley", "keegan.bradley@example.com", "+91 98111 00016", 5.2),
            ("Cameron", "Young", "cameron.young@example.com", "+91 98111 00017", 5.6),
            ("Rickie", "Fowler", "rickie.fowler@example.com", "+91 98111 00018", 6.1),
            ("Shane", "Lowry", "shane.lowry@example.com", "+91 98111 00019", 6.7),
            ("Tommy", "Fleetwood", "tommy.fleetwood@example.com", "+91 98111 00020", 7.2),
            ("Justin", "Rose", "justin.rose@example.com", "+91 98111 00021", 7.9),
            ("Min Woo", "Lee", "minwoo.lee@example.com", "+91 98111 00022", 8.5),
            ("Ludvig", "Åberg", "ludvig.aberg@example.com", "+91 98111 00023", 9.1),
            ("Jason", "Day", "jason.day@example.com", "+91 98111 00024", 9.8),
            ("Sahith", "Theegala", "sahith.theegala@example.com", "+91 98111 00025", 10.4),
            ("Anirban", "Lahiri", "anirban.lahiri@example.com", "+91 98111 00026", 11.2),
            ("Shubhankar", "Sharma", "shubhankar.sharma@example.com", "+91 98111 00027", 12.0),
            ("Jeev", "Singh", "jeev.singh@example.com", "+91 98111 00028", 13.5),
            ("Shiv", "Kapur", "shiv.kapur@example.com", "+91 98111 00029", 14.8),
            ("Gaganjeet", "Bhullar", "gaganjeet.bhullar@example.com", "+91 98111 00030", 16.2),
            ("Aditi", "Ashok", "aditi.ashok@example.com", "+91 98111 00031", 17.5),
            ("Nelly", "Korda", "nelly.korda@example.com", "+91 98111 00032", 19.0),
            ("Lydia", "Ko", "lydia.ko@example.com", "+91 98111 00033", 21.4),
            ("Brooke", "Henderson", "brooke.henderson@example.com", "+91 98111 00034", 23.8),
            ("Charley", "Hull", "charley.hull@example.com", "+91 98111 00035", 26.5),
            ("Rose", "Zhang", "rose.zhang@example.com", "+91 98111 00036", 28.0)
        };

        var createdCount = 0;
        var existingTournaments = await _db.Tournaments.Where(t => t.TenantId == tenantId).ToListAsync();
        var existingBays = await _db.RangeBays.Where(rb => rb.TenantId == tenantId).ToListAsync();
        var rnd = new Random(42);

        foreach (var item in seedList)
        {
            var user = await _userManager.FindByEmailAsync(item.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = item.Email,
                    Email = item.Email,
                    FirstName = item.FirstName,
                    LastName = item.LastName,
                    PhoneNumber = item.Phone,
                    HandicapIndex = item.Handicap,
                    Role = AppRole.Golfer,
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(10, 180))
                };

                var res = await _userManager.CreateAsync(user, "GolferPass123!");
                if (res.Succeeded)
                {
                    createdCount++;
                }
            }
            else
            {
                user.TenantId = tenantId;
                user.HandicapIndex = item.Handicap;
                user.PhoneNumber = item.Phone;
                await _userManager.UpdateAsync(user);
            }

            if (existingTournaments.Any() && rnd.Next(0, 2) == 1)
            {
                var tourn = existingTournaments[rnd.Next(0, existingTournaments.Count)];
                var alreadyReg = await _db.TournamentRegistrations
                    .AnyAsync(r => r.TournamentId == tourn.Id && (r.UserId == user.Id || r.GolferEmail == user.Email));

                if (!alreadyReg)
                {
                    var isPaid = rnd.Next(0, 4) > 0;
                    _db.TournamentRegistrations.Add(new TournamentRegistration
                    {
                        TournamentId = tourn.Id,
                        TenantId = tenantId,
                        UserId = user.Id,
                        GolferName = $"{user.FirstName} {user.LastName}",
                        GolferEmail = user.Email ?? string.Empty,
                        HandicapIndex = (decimal?)user.HandicapIndex,
                        Status = TournamentRegistrationStatus.Registered,
                        PaymentStatus = isPaid ? TournamentPaymentStatus.Paid : TournamentPaymentStatus.Unpaid,
                        AmountPaid = isPaid ? tourn.EntryFee : 0,
                        RegisteredAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 14))
                    });
                }
            }

            if (existingBays.Any() && rnd.Next(0, 3) == 1)
            {
                var bay = existingBays[rnd.Next(0, existingBays.Count)];
                _db.BayBookings.Add(new BayBooking
                {
                    TenantId = tenantId,
                    RangeBayId = bay.Id,
                    UserId = user.Id,
                    GolferName = $"{user.FirstName} {user.LastName}",
                    GolferEmail = user.Email ?? string.Empty,
                    StartTime = DateTime.UtcNow.AddHours(-rnd.Next(2, 48)),
                    EndTime = DateTime.UtcNow.AddHours(-rnd.Next(2, 48)).AddMinutes(60),
                    DurationMinutes = 60,
                    Price = bay.HourlyRate,
                    Status = BayBookingStatus.Completed,
                    PaymentStatus = BayPaymentStatus.Paid,
                    AmountPaid = bay.HourlyRate,
                    CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 10))
                });
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = $"Successfully seeded {createdCount} new golfers and updated {seedList.Length} member profiles for tenant.", total = seedList.Length });
    }
}
