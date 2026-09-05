using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using ChipAndChill.Api.Services;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}/tournaments")]
public class TournamentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITenantNotificationService _notificationService;

    public TournamentsController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ITenantNotificationService notificationService)
    {
        _db = db;
        _userManager = userManager;
        _notificationService = notificationService;
    }

    // GET /api/tenants/{tenantId}/tournaments
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TournamentSummaryResponse>>> GetTournaments(Guid tenantId, [FromQuery] TournamentStatus? status)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId && t.IsPublic)
            .Include(t => t.Registrations)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        var list = await query
            .OrderBy(t => t.StartDate)
            .ToListAsync();

        return Ok(list.Select(t => new TournamentSummaryResponse(
            t.Id,
            t.TenantId,
            t.Name,
            t.Description,
            t.Format,
            t.Status,
            t.StartDate,
            t.EndDate,
            t.EntryFee,
            t.MaxParticipants,
            t.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn),
            t.HolesCount,
            t.IsPublic,
            t.PrizePurse,
            t.RoundsCount,
            t.CurrentRound,
            t.CreatedAt
        )));
    }

    // GET /api/tenants/{tenantId}/tournaments/{id} OR /api/tournaments/{id}
    [HttpGet("{id:guid}")]
    [HttpGet("/api/tournaments/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentDetailResponse>> GetTournament(Guid? tenantId, Guid id)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.Id == id);

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            query = query.Where(t => t.TenantId == tenantId.Value);
        }

        var tournament = await query
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync();

        if (tournament == null) return NotFound("Tournament not found.");

        var regDtos = tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        ));

        var leaderboard = ComputeLeaderboard(tournament);

        return Ok(new TournamentDetailResponse(
            tournament.Id,
            tournament.TenantId,
            tournament.Name,
            tournament.Description,
            tournament.Format,
            tournament.Status,
            tournament.StartDate,
            tournament.EndDate,
            tournament.EntryFee,
            tournament.MaxParticipants,
            tournament.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn),
            tournament.HolesCount,
            tournament.IsPublic,
            tournament.PrizePurse,
            tournament.ClosestToPinHole,
            tournament.ClosestToPinWinner,
            tournament.LongestDriveHole,
            tournament.LongestDriveWinner,
            tournament.RoundsCount,
            tournament.CurrentRound,
            tournament.CutRule,
            tournament.CutAppliedAfterRound,
            tournament.CreatedAt,
            regDtos,
            leaderboard
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments
    [HttpPost]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TournamentSummaryResponse>> CreateTournament(Guid tenantId, CreateTournamentRequest req)
    {
        var tournament = new Tournament
        {
            TenantId = tenantId,
            Name = req.Name,
            Description = req.Description,
            Format = req.Format,
            Status = TournamentStatus.Upcoming,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            EntryFee = Math.Max(0, req.EntryFee),
            MaxParticipants = Math.Max(4, req.MaxParticipants),
            HolesCount = req.HolesCount > 0 ? req.HolesCount : 18,
            IsPublic = req.IsPublic,
            PrizePurse = req.PrizePurse.HasValue ? Math.Max(0, req.PrizePurse.Value) : 0m,
            RoundsCount = req.RoundsCount >= 1 ? Math.Min(4, req.RoundsCount) : 1,
            CurrentRound = 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.Tournaments.Add(tournament);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTournament), new { tenantId, id = tournament.Id }, new TournamentSummaryResponse(
            tournament.Id,
            tournament.TenantId,
            tournament.Name,
            tournament.Description,
            tournament.Format,
            tournament.Status,
            tournament.StartDate,
            tournament.EndDate,
            tournament.EntryFee,
            tournament.MaxParticipants,
            0,
            tournament.HolesCount,
            tournament.IsPublic,
            tournament.PrizePurse,
            tournament.RoundsCount,
            tournament.CurrentRound,
            tournament.CreatedAt
        ));
    }

    // PUT /api/tenants/{tenantId}/tournaments/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TournamentSummaryResponse>> UpdateTournament(Guid tenantId, Guid id, UpdateTournamentRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        if (req.Name != null) tournament.Name = req.Name;
        if (req.Description != null) tournament.Description = req.Description;
        if (req.Format.HasValue) tournament.Format = req.Format.Value;
        if (req.Status.HasValue) tournament.Status = req.Status.Value;
        if (req.StartDate.HasValue) tournament.StartDate = req.StartDate.Value;
        if (req.EndDate.HasValue) tournament.EndDate = req.EndDate.Value;
        if (req.EntryFee.HasValue) tournament.EntryFee = Math.Max(0, req.EntryFee.Value);
        if (req.MaxParticipants.HasValue) tournament.MaxParticipants = Math.Max(4, req.MaxParticipants.Value);
        if (req.HolesCount.HasValue) tournament.HolesCount = req.HolesCount.Value;
        if (req.IsPublic.HasValue) tournament.IsPublic = req.IsPublic.Value;
        if (req.PrizePurse.HasValue) tournament.PrizePurse = Math.Max(0, req.PrizePurse.Value);
        if (req.ClosestToPinHole.HasValue) tournament.ClosestToPinHole = req.ClosestToPinHole.Value;
        if (req.ClosestToPinWinner != null) tournament.ClosestToPinWinner = req.ClosestToPinWinner;
        if (req.LongestDriveHole.HasValue) tournament.LongestDriveHole = req.LongestDriveHole.Value;
        if (req.LongestDriveWinner != null) tournament.LongestDriveWinner = req.LongestDriveWinner;
        if (req.RoundsCount.HasValue) tournament.RoundsCount = Math.Max(1, Math.Min(4, req.RoundsCount.Value));
        if (req.CurrentRound.HasValue) tournament.CurrentRound = Math.Max(1, Math.Min(tournament.RoundsCount, req.CurrentRound.Value));
        if (req.CutRule != null) tournament.CutRule = req.CutRule;

        await _db.SaveChangesAsync();

        return Ok(new TournamentSummaryResponse(
            tournament.Id,
            tournament.TenantId,
            tournament.Name,
            tournament.Description,
            tournament.Format,
            tournament.Status,
            tournament.StartDate,
            tournament.EndDate,
            tournament.EntryFee,
            tournament.MaxParticipants,
            tournament.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn),
            tournament.HolesCount,
            tournament.IsPublic,
            tournament.PrizePurse,
            tournament.RoundsCount,
            tournament.CurrentRound,
            tournament.CreatedAt
        ));
    }

    // PUT /api/tenants/{tenantId}/tournaments/{id}/side-contests
    [HttpPut("{id:guid}/side-contests")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TournamentDetailResponse>> UpdateSideContests(Guid tenantId, Guid id, UpdateTournamentSideContestsRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        if (req.ClosestToPinHole.HasValue) tournament.ClosestToPinHole = req.ClosestToPinHole.Value;
        if (req.ClosestToPinWinner != null) tournament.ClosestToPinWinner = req.ClosestToPinWinner;
        if (req.LongestDriveHole.HasValue) tournament.LongestDriveHole = req.LongestDriveHole.Value;
        if (req.LongestDriveWinner != null) tournament.LongestDriveWinner = req.LongestDriveWinner;
        if (req.PrizePurse.HasValue) tournament.PrizePurse = Math.Max(0, req.PrizePurse.Value);

        await _db.SaveChangesAsync();

        var regDtos = tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        ));

        return Ok(new TournamentDetailResponse(
            tournament.Id,
            tournament.TenantId,
            tournament.Name,
            tournament.Description,
            tournament.Format,
            tournament.Status,
            tournament.StartDate,
            tournament.EndDate,
            tournament.EntryFee,
            tournament.MaxParticipants,
            tournament.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn),
            tournament.HolesCount,
            tournament.IsPublic,
            tournament.PrizePurse,
            tournament.ClosestToPinHole,
            tournament.ClosestToPinWinner,
            tournament.LongestDriveHole,
            tournament.LongestDriveWinner,
            tournament.RoundsCount,
            tournament.CurrentRound,
            tournament.CutRule,
            tournament.CutAppliedAfterRound,
            tournament.CreatedAt,
            regDtos,
            ComputeLeaderboard(tournament)
        ));
    }

    // PUT /api/tenants/{tenantId}/tournaments/{id}/current-round
    [HttpPut("{id:guid}/current-round")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> SetCurrentRound(Guid tenantId, Guid id, UpdateCurrentRoundRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        tournament.CurrentRound = Math.Max(1, Math.Min(tournament.RoundsCount, req.RoundNumber));
        await _db.SaveChangesAsync();

        return Ok(new { success = true, currentRound = tournament.CurrentRound });
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/cut
    [HttpPost("{id:guid}/cut")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TournamentDetailResponse>> ApplyCut(Guid tenantId, Guid id, ApplyCutRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        var leaderboard = ComputeLeaderboard(tournament).ToList();
        var cutRankThreshold = Math.Max(1, req.CutRank);

        // Find target cut score
        int cutScore = int.MaxValue;
        if (leaderboard.Count >= cutRankThreshold)
        {
            cutScore = leaderboard[cutRankThreshold - 1].ToPar;
        }

        foreach (var reg in tournament.Registrations)
        {
            var lbRow = leaderboard.FirstOrDefault(l => l.RegistrationId == reg.Id);
            if (lbRow == null || lbRow.ThruHoles == 0)
            {
                reg.MadeCut = false;
                continue;
            }

            if (req.IncludeTies)
            {
                reg.MadeCut = lbRow.ToPar <= cutScore;
            }
            else
            {
                reg.MadeCut = lbRow.Rank <= cutRankThreshold;
            }
        }

        tournament.CutRule = $"Top {req.CutRank} {(req.IncludeTies ? "+ Ties" : "")}";
        tournament.CutAppliedAfterRound = req.AfterRound;

        await _db.SaveChangesAsync();

        var regDtos = tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        ));

        return Ok(new TournamentDetailResponse(
            tournament.Id,
            tournament.TenantId,
            tournament.Name,
            tournament.Description,
            tournament.Format,
            tournament.Status,
            tournament.StartDate,
            tournament.EndDate,
            tournament.EntryFee,
            tournament.MaxParticipants,
            tournament.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn),
            tournament.HolesCount,
            tournament.IsPublic,
            tournament.PrizePurse,
            tournament.ClosestToPinHole,
            tournament.ClosestToPinWinner,
            tournament.LongestDriveHole,
            tournament.LongestDriveWinner,
            tournament.RoundsCount,
            tournament.CurrentRound,
            tournament.CutRule,
            tournament.CutAppliedAfterRound,
            tournament.CreatedAt,
            regDtos,
            ComputeLeaderboard(tournament)
        ));
    }

    // DELETE /api/tenants/{tenantId}/tournaments/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "CourseAdmin,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> DeleteTournament(Guid tenantId, Guid id)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound();

        _db.Tournaments.Remove(tournament);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/register
    [HttpPost("{id:guid}/register")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentRegistrationDto>> Register(Guid tenantId, Guid id, RegisterTournamentRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        if (tournament.Status != TournamentStatus.Upcoming)
            return BadRequest("Tournament registration is closed.");

        var activeCount = tournament.Registrations.Count(r => r.Status != TournamentRegistrationStatus.Withdrawn);
        if (activeCount >= tournament.MaxParticipants)
            return BadRequest("Tournament is fully booked.");

        Guid? userId = null;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsedId))
        {
            userId = parsedId;
        }

        var isFree = tournament.EntryFee <= 0;
        var reg = new TournamentRegistration
        {
            TournamentId = id,
            TenantId = tenantId,
            UserId = userId,
            GolferName = req.GolferName.Trim(),
            GolferEmail = req.GolferEmail.Trim().ToLowerInvariant(),
            HandicapIndex = req.HandicapIndex,
            Flight = req.Flight?.Trim(),
            MadeCut = true,
            Status = TournamentRegistrationStatus.Registered,
            PaymentStatus = isFree ? TournamentPaymentStatus.Free : TournamentPaymentStatus.Unpaid,
            AmountPaid = isFree ? 0m : 0m,
            RegisteredAt = DateTime.UtcNow
        };

        tournament.Registrations.Add(reg);
        await _db.SaveChangesAsync();

        if (isFree)
        {
            await _notificationService.SendTournamentRegistrationAsync(tenantId, reg, tournament);
        }

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Flight,
            reg.MadeCut,
            reg.PointsEarned,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // PUT /api/tenants/{tenantId}/tournaments/{id}/registrations/{regId}/flight
    [HttpPut("{id:guid}/registrations/{regId:guid}/flight")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<TournamentRegistrationDto>> UpdateFlight(Guid tenantId, Guid id, Guid regId, UpdateFlightRequest req)
    {
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == regId);

        if (reg == null) return NotFound("Registration not found.");

        reg.Flight = req.Flight?.Trim();
        await _db.SaveChangesAsync();

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Flight,
            reg.MadeCut,
            reg.PointsEarned,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/registrations/{regId}/withdraw
    [HttpPost("{id:guid}/registrations/{regId:guid}/withdraw")]
    [Authorize]
    public async Task<ActionResult<TournamentRegistrationDto>> WithdrawRegistration(Guid tenantId, Guid id, Guid regId)
    {
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == regId);

        if (reg == null) return NotFound("Registration not found.");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? currentUserId = null;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsed)) currentUserId = parsed;

        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = reg.UserId.HasValue && reg.UserId == currentUserId;

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        reg.Status = TournamentRegistrationStatus.Withdrawn;
        reg.PairingGroup = null;
        reg.TeeTime = null;

        await _db.SaveChangesAsync();

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Flight,
            reg.MadeCut,
            reg.PointsEarned,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/auto-flight
    [HttpPost("{id:guid}/auto-flight")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<TournamentRegistrationDto>>> AutoFlight(Guid tenantId, Guid id, AutoFlightRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        foreach (var reg in tournament.Registrations)
        {
            var hcp = reg.HandicapIndex ?? 18.0m;
            var matchedRule = req.Rules.FirstOrDefault(r => hcp >= r.MinHandicap && hcp <= r.MaxHandicap);
            if (matchedRule != null)
            {
                reg.Flight = matchedRule.FlightName;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        )));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/confirm-sandbox-payment
    [HttpPost("{id:guid}/confirm-sandbox-payment")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentRegistrationDto>> ConfirmSandboxPayment(
        Guid tenantId,
        Guid id,
        [FromQuery] Guid registrationId,
        [FromQuery] string? email = null)
    {
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .Include(r => r.Tournament)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == registrationId);

        if (reg == null) return NotFound("Registration not found.");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? currentUserId = null;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var parsed)) currentUserId = parsed;

        ApplicationUser? currentUser = null;
        if (currentUserId.HasValue)
        {
            currentUser = await _userManager.FindByIdAsync(currentUserId.Value.ToString());
        }

        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = (reg.UserId.HasValue && reg.UserId == currentUserId) ||
                      (!reg.UserId.HasValue && (
                          (currentUser != null && string.Equals(currentUser.Email, reg.GolferEmail, StringComparison.OrdinalIgnoreCase)) ||
                          (!string.IsNullOrWhiteSpace(email) && string.Equals(email, reg.GolferEmail, StringComparison.OrdinalIgnoreCase)) ||
                          (reg.RegisteredAt >= DateTime.UtcNow.AddMinutes(-10))
                      ));

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        reg.Status = TournamentRegistrationStatus.Confirmed;
        reg.PaymentStatus = TournamentPaymentStatus.Paid;
        reg.AmountPaid = reg.Tournament?.EntryFee ?? 0m;

        await _db.SaveChangesAsync();

        if (reg.Tournament != null)
        {
            await _notificationService.SendTournamentRegistrationAsync(tenantId, reg, reg.Tournament);
        }

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Flight,
            reg.MadeCut,
            reg.PointsEarned,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/pairings/auto
    [HttpPost("{id:guid}/pairings/auto")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<TournamentRegistrationDto>>> GeneratePairings(Guid tenantId, Guid id, GeneratePairingsRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        var activeRegs = tournament.Registrations
            .Where(r => r.Status != TournamentRegistrationStatus.Withdrawn)
            .OrderBy(r => r.HandicapIndex ?? 99m)
            .ToList();

        if (activeRegs.Count == 0) return Ok(Enumerable.Empty<TournamentRegistrationDto>());

        int playersPerGroup = Math.Max(1, req.PlayersPerGroup);
        int intervalMins = Math.Max(1, req.IntervalMinutes);
        DateTime baseTime = req.FirstTeeTime ?? tournament.StartDate;

        int groupNum = 1;
        for (int i = 0; i < activeRegs.Count; i++)
        {
            var reg = activeRegs[i];
            reg.PairingGroup = groupNum;
            reg.TeeTime = baseTime.AddMinutes((groupNum - 1) * intervalMins);

            if ((i + 1) % playersPerGroup == 0)
            {
                groupNum++;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        )));
    }

    // PUT /api/tenants/{tenantId}/tournaments/{id}/pairings/batch
    [HttpPut("{id:guid}/pairings/batch")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<TournamentRegistrationDto>>> BatchUpdatePairings(Guid tenantId, Guid id, BatchUpdatePairingsRequest req)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        var regLookup = tournament.Registrations.ToDictionary(r => r.Id);

        foreach (var assign in req.Assignments)
        {
            if (regLookup.TryGetValue(assign.RegistrationId, out var reg))
            {
                reg.PairingGroup = assign.PairingGroup;
                reg.TeeTime = assign.TeeTime;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        )));
    }

    // DELETE /api/tenants/{tenantId}/tournaments/{id}/pairings
    [HttpDelete("{id:guid}/pairings")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<TournamentRegistrationDto>>> ClearPairings(Guid tenantId, Guid id)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id);

        if (tournament == null) return NotFound("Tournament not found.");

        foreach (var reg in tournament.Registrations)
        {
            reg.PairingGroup = null;
            reg.TeeTime = null;
        }

        await _db.SaveChangesAsync();

        return Ok(tournament.Registrations.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
            r.Flight,
            r.MadeCut,
            r.PointsEarned,
            r.Status,
            r.PaymentStatus,
            r.AmountPaid,
            r.PairingGroup,
            r.TeeTime,
            r.RegisteredAt
        )));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/scores
    [HttpPost("{id:guid}/scores")]
    [Authorize]
    public async Task<IActionResult> PostScore(Guid tenantId, Guid id, PostTournamentScoreRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == req.RegistrationId);

        if (reg == null) return NotFound("Registration not found.");

        var user = await _userManager.FindByIdAsync(userId.ToString());
        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = (reg.UserId.HasValue && reg.UserId == userId) || 
                      (!reg.UserId.HasValue && user != null && string.Equals(user.Email, reg.GolferEmail, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        var roundNum = req.RoundNumber > 0 ? req.RoundNumber : 1;
        var existing = await _db.TournamentScores
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TournamentId == id && s.RegistrationId == req.RegistrationId && s.HoleNumber == req.HoleNumber && s.RoundNumber == roundNum);

        var points = CalculateStableford(req.GrossScore, req.Par);

        if (existing != null)
        {
            existing.GrossScore = req.GrossScore;
            existing.Par = req.Par;
            existing.Points = points;
            existing.EnteredAt = DateTime.UtcNow;
        }
        else
        {
            _db.TournamentScores.Add(new TournamentScore
            {
                TournamentId = id,
                TenantId = tenantId,
                RegistrationId = req.RegistrationId,
                UserId = reg.UserId,
                RoundNumber = roundNum,
                HoleNumber = req.HoleNumber,
                GrossScore = req.GrossScore,
                Par = req.Par,
                Points = points,
                EnteredAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/scores/batch
    [HttpPost("{id:guid}/scores/batch")]
    [Authorize]
    public async Task<IActionResult> BatchPostScores(Guid tenantId, Guid id, BatchPostTournamentScoresRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == req.RegistrationId);

        if (reg == null) return NotFound("Registration not found.");

        var user = await _userManager.FindByIdAsync(userId.ToString());
        var isStaffOrAdmin = User.IsInRole("CourseAdmin") || User.IsInRole("Staff") || User.IsInRole("SuperAdmin");
        var isOwner = (reg.UserId.HasValue && reg.UserId == userId) || 
                      (!reg.UserId.HasValue && user != null && string.Equals(user.Email, reg.GolferEmail, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isStaffOrAdmin)
            return Forbid();

        var roundNum = req.RoundNumber > 0 ? req.RoundNumber : 1;

        // BUG-03 FIX: Load ALL existing scores for this registration in ONE query before the loop
        // to avoid N+1 database queries (one per hole).
        var existingScores = await _db.TournamentScores
            .IgnoreQueryFilters()
            .Where(s => s.TournamentId == id && s.RegistrationId == req.RegistrationId && s.RoundNumber == roundNum)
            .ToListAsync();

        var existingLookup = existingScores.ToDictionary(s => s.HoleNumber);

        foreach (var item in req.Scores)
        {
            var points = CalculateStableford(item.GrossScore, item.Par);

            if (existingLookup.TryGetValue(item.HoleNumber, out var existing))
            {
                existing.GrossScore = item.GrossScore;
                existing.Par = item.Par;
                existing.Points = points;
                existing.EnteredAt = DateTime.UtcNow;
            }
            else
            {
                _db.TournamentScores.Add(new TournamentScore
                {
                    TournamentId = id,
                    TenantId = tenantId,
                    RegistrationId = req.RegistrationId,
                    UserId = reg.UserId,
                    RoundNumber = roundNum,
                    HoleNumber = item.HoleNumber,
                    GrossScore = item.GrossScore,
                    Par = item.Par,
                    Points = points,
                    EnteredAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // GET /api/tenants/{tenantId}/tournaments/{id}/leaderboard OR /api/tournaments/{id}/leaderboard
    [HttpGet("{id:guid}/leaderboard")]
    [HttpGet("/api/tournaments/{id:guid}/leaderboard")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TournamentLeaderboardRowDto>>> GetLeaderboard(Guid? tenantId, Guid id, [FromQuery] string? flight = null)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.Id == id);

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            query = query.Where(t => t.TenantId == tenantId.Value);
        }

        var tournament = await query
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync();

        if (tournament == null) return NotFound("Tournament not found.");

        var leaderboard = ComputeLeaderboard(tournament);
        if (!string.IsNullOrWhiteSpace(flight))
        {
            leaderboard = leaderboard.Where(r => string.Equals(r.Flight, flight, StringComparison.OrdinalIgnoreCase));
            // Re-rank for filtered flight
            var reRanked = new List<TournamentLeaderboardRowDto>();
            int rk = 1;
            foreach (var r in leaderboard)
            {
                reRanked.Add(r with { Rank = rk++ });
            }
            return Ok(reRanked);
        }

        return Ok(leaderboard);
    }

    // GET /api/tenants/{tenantId}/tournaments/{id}/skins OR /api/tournaments/{id}/skins
    [HttpGet("{id:guid}/skins")]
    [HttpGet("/api/tournaments/{id:guid}/skins")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentSkinsSummaryDto>> GetSkins(Guid? tenantId, Guid id, [FromQuery] string? flight = null)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.Id == id);

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            query = query.Where(t => t.TenantId == tenantId.Value);
        }

        var tournament = await query
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync();

        if (tournament == null) return NotFound("Tournament not found.");

        var activeRegs = tournament.Registrations
            .Where(r => r.Status != TournamentRegistrationStatus.Withdrawn)
            .ToList();

        if (!string.IsNullOrWhiteSpace(flight))
        {
            activeRegs = activeRegs.Where(r => string.Equals(r.Flight, flight, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var regLookup = activeRegs.ToDictionary(r => r.Id);
        var totalHoles = tournament.HolesCount > 0 ? tournament.HolesCount : 18;

        var grossSkins = new List<TournamentSkinsResultDto>();
        var netSkins = new List<TournamentSkinsResultDto>();

        for (int h = 1; h <= totalHoles; h++)
        {
            var holeNum = h;
            var holeScores = tournament.Scores
                .Where(s => s.HoleNumber == holeNum && s.RoundNumber == tournament.CurrentRound && regLookup.ContainsKey(s.RegistrationId))
                .ToList();

            int par = holeScores.FirstOrDefault()?.Par ?? 4;

            // Compute Gross Skin
            if (holeScores.Count > 0)
            {
                var minGross = holeScores.Min(s => s.GrossScore);
                var lowestGrossPlayers = holeScores.Where(s => s.GrossScore == minGross).ToList();

                if (lowestGrossPlayers.Count == 1)
                {
                    var winnerScore = lowestGrossPlayers[0];
                    var reg = regLookup[winnerScore.RegistrationId];
                    grossSkins.Add(new TournamentSkinsResultDto(
                        holeNum,
                        reg.Id,
                        reg.GolferName,
                        reg.Flight,
                        minGross,
                        par,
                        false,
                        false,
                        1
                    ));
                }
                else
                {
                    grossSkins.Add(new TournamentSkinsResultDto(
                        holeNum,
                        null,
                        null,
                        null,
                        minGross,
                        par,
                        false,
                        true, // Carryover
                        0
                    ));
                }

                // Compute Net Skin (gross - hole handicap stroke allowance)
                var netCalculated = holeScores.Select(s =>
                {
                    var reg = regLookup[s.RegistrationId];
                    var hcp = reg.HandicapIndex.HasValue ? (double)reg.HandicapIndex.Value : 0.0;
                    var strokeAllowance = (int)Math.Floor(hcp / totalHoles) + ((holeNum <= (hcp % totalHoles)) ? 1 : 0);
                    var netScore = Math.Max(1, s.GrossScore - strokeAllowance);
                    return new { Score = s, Reg = reg, NetScore = netScore };
                }).ToList();

                var minNet = netCalculated.Min(x => x.NetScore);
                var lowestNetPlayers = netCalculated.Where(x => x.NetScore == minNet).ToList();

                if (lowestNetPlayers.Count == 1)
                {
                    var winner = lowestNetPlayers[0];
                    netSkins.Add(new TournamentSkinsResultDto(
                        holeNum,
                        winner.Reg.Id,
                        winner.Reg.GolferName,
                        winner.Reg.Flight,
                        winner.NetScore,
                        par,
                        true,
                        false,
                        1
                    ));
                }
                else
                {
                    netSkins.Add(new TournamentSkinsResultDto(
                        holeNum,
                        null,
                        null,
                        null,
                        minNet,
                        par,
                        true,
                        true,
                        0
                    ));
                }
            }
            else
            {
                grossSkins.Add(new TournamentSkinsResultDto(holeNum, null, null, null, par, par, false, true, 0));
                netSkins.Add(new TournamentSkinsResultDto(holeNum, null, null, null, par, par, true, true, 0));
            }
        }

        var totalGrossSkinCount = grossSkins.Count(s => !s.IsCarryover && s.WinnerRegistrationId.HasValue);
        var totalNetSkinCount = netSkins.Count(s => !s.IsCarryover && s.WinnerRegistrationId.HasValue);
        var totalPot = tournament.PrizePurse > 0 ? tournament.PrizePurse * 0.25m : (tournament.EntryFee * activeRegs.Count * 0.25m);

        return Ok(new TournamentSkinsSummaryDto(
            totalGrossSkinCount + totalNetSkinCount,
            totalPot,
            grossSkins,
            netSkins
        ));
    }

    // GET /api/tenants/{tenantId}/tournaments/{id}/payouts OR /api/tournaments/{id}/payouts
    [HttpGet("{id:guid}/payouts")]
    [HttpGet("/api/tournaments/{id:guid}/payouts")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentPayoutsResponse>> GetPayouts(Guid? tenantId, Guid id, [FromQuery] decimal? customPurse = null)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.Id == id);

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            query = query.Where(t => t.TenantId == tenantId.Value);
        }

        var tournament = await query
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync();

        if (tournament == null) return NotFound("Tournament not found.");

        var activeRegs = tournament.Registrations
            .Where(r => r.Status != TournamentRegistrationStatus.Withdrawn)
            .ToList();

        var totalPurse = customPurse ?? (tournament.PrizePurse > 0 
            ? tournament.PrizePurse 
            : tournament.EntryFee * activeRegs.Count(r => r.PaymentStatus == TournamentPaymentStatus.Paid || r.PaymentStatus == TournamentPaymentStatus.Free));

        if (totalPurse <= 0)
        {
            totalPurse = tournament.EntryFee * Math.Max(activeRegs.Count, 1);
        }

        var leaderboard = ComputeLeaderboard(tournament).ToList();
        var numPlayers = leaderboard.Count;

        var payoutPercentages = GetPayoutPercentages(numPlayers);
        var totalPaidPlaces = Math.Min(payoutPercentages.Length, numPlayers);

        var payoutRows = new List<TournamentPayoutRowDto>();

        int placeIndex = 0;
        int i = 0;
        while (i < leaderboard.Count && placeIndex < totalPaidPlaces)
        {
            var current = leaderboard[i];
            var tiedGroup = leaderboard.Where(x => 
                tournament.Format == TournamentFormat.Stableford 
                    ? x.StablefordPoints == current.StablefordPoints 
                    : x.ToPar == current.ToPar && x.ThruHoles == current.ThruHoles && x.ThruHoles > 0
            ).ToList();

            if (current.ThruHoles == 0)
            {
                tiedGroup = new List<TournamentLeaderboardRowDto> { current };
            }

            int groupSize = tiedGroup.Count;
            double pooledPercent = 0;

            for (int k = 0; k < groupSize; k++)
            {
                int pIdx = placeIndex + k;
                if (pIdx < payoutPercentages.Length)
                {
                    pooledPercent += payoutPercentages[pIdx];
                }
            }

            double perPlayerPercent = groupSize > 0 ? (pooledPercent / groupSize) : 0;
            decimal perPlayerAmount = Math.Round(totalPurse * (decimal)(perPlayerPercent / 100.0), 2);
            bool isTie = groupSize > 1;

            foreach (var player in tiedGroup)
            {
                payoutRows.Add(new TournamentPayoutRowDto(
                    current.Rank,
                    player.RegistrationId,
                    player.GolferName,
                    player.Flight,
                    perPlayerAmount,
                    Math.Round(perPlayerPercent, 2),
                    isTie,
                    player.TotalGross,
                    player.NetToPar
                ));
            }

            placeIndex += groupSize;
            i += groupSize;
        }

        return Ok(new TournamentPayoutsResponse(
            totalPurse,
            totalPaidPlaces,
            payoutRows.OrderBy(p => p.Rank).ToList()
        ));
    }

    // GET /api/tenants/{tenantId}/tournaments/order-of-merit OR /api/tournaments/order-of-merit
    [HttpGet("order-of-merit")]
    [HttpGet("/api/tournaments/order-of-merit")]
    [AllowAnonymous]
    public async Task<ActionResult<OrderOfMeritResponse>> GetOrderOfMerit(Guid? tenantId)
    {
        var query = _db.Tournaments
            .IgnoreQueryFilters()
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .AsQueryable();

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            query = query.Where(t => t.TenantId == tenantId.Value);
        }

        var tournaments = await query.ToListAsync();

        // Points allocation scale
        var ptsScale = new Dictionary<int, int>
        {
            { 1, 500 },
            { 2, 300 },
            { 3, 190 },
            { 4, 135 },
            { 5, 110 },
            { 6, 100 },
            { 7, 90 },
            { 8, 85 },
            { 9, 80 },
            { 10, 75 }
        };

        var golferStats = new Dictionary<string, (string Name, decimal? Handicap, int Points, int Played, int Wins, int Top10s, decimal Earnings)>();

        foreach (var tourn in tournaments)
        {
            var lb = ComputeLeaderboard(tourn).ToList();
            var totalPurse = tourn.PrizePurse > 0 ? tourn.PrizePurse : tourn.EntryFee * tourn.Registrations.Count;
            var payoutPercentages = GetPayoutPercentages(lb.Count);

            for (int rk = 1; rk <= lb.Count; rk++)
            {
                var row = lb[rk - 1];
                var reg = tourn.Registrations.FirstOrDefault(r => r.Id == row.RegistrationId);
                var email = reg?.GolferEmail?.ToLowerInvariant() ?? row.GolferName.ToLowerInvariant();

                int pts = ptsScale.TryGetValue(rk, out var pVal) ? pVal : (rk <= 20 ? 50 : 25);
                bool isWin = rk == 1;
                bool isTop10 = rk <= 10;
                decimal earnings = 0m;
                if (rk <= payoutPercentages.Length && totalPurse > 0)
                {
                    earnings = Math.Round(totalPurse * (decimal)(payoutPercentages[rk - 1] / 100.0), 2);
                }

                if (!golferStats.ContainsKey(email))
                {
                    golferStats[email] = (row.GolferName, row.HandicapIndex, pts, 1, isWin ? 1 : 0, isTop10 ? 1 : 0, earnings);
                }
                else
                {
                    var cur = golferStats[email];
                    golferStats[email] = (
                        cur.Name,
                        row.HandicapIndex ?? cur.Handicap,
                        cur.Points + pts,
                        cur.Played + 1,
                        cur.Wins + (isWin ? 1 : 0),
                        cur.Top10s + (isTop10 ? 1 : 0),
                        cur.Earnings + earnings
                    );
                }
            }
        }

        var standings = golferStats.Values
            .OrderByDescending(g => g.Points)
            .ThenByDescending(g => g.Wins)
            .ThenByDescending(g => g.Earnings)
            .Select((g, idx) => new OrderOfMeritRowDto(
                idx + 1,
                g.Name,
                "",
                g.Handicap,
                g.Points,
                g.Played,
                g.Wins,
                g.Top10s,
                g.Earnings
            ))
            .ToList();

        return Ok(new OrderOfMeritResponse(
            tenantId ?? Guid.Empty,
            $"Season {DateTime.UtcNow.Year} Order of Merit",
            standings
        ));
    }

    private static double[] GetPayoutPercentages(int totalPlayers)
    {
        if (totalPlayers <= 1) return new[] { 100.0 };
        if (totalPlayers == 2) return new[] { 65.0, 35.0 };
        if (totalPlayers == 3) return new[] { 50.0, 30.0, 20.0 };
        if (totalPlayers <= 5) return new[] { 45.0, 25.0, 18.0, 12.0 };
        if (totalPlayers <= 10) return new[] { 38.0, 24.0, 16.0, 12.0, 10.0 };
        return new[] { 32.0, 20.0, 14.0, 10.0, 8.0, 6.0, 4.0, 3.0, 2.0, 1.0 };
    }

    private static IEnumerable<TournamentLeaderboardRowDto> ComputeLeaderboard(Tournament tournament)
    {
        var rows = new List<TournamentLeaderboardRowDto>();

        var activeRegs = tournament.Registrations
            .Where(r => r.Status != TournamentRegistrationStatus.Withdrawn)
            .ToList();

        var totalHoles = tournament.HolesCount > 0 ? tournament.HolesCount : 18;
        var roundsCount = tournament.RoundsCount > 0 ? tournament.RoundsCount : 1;

        foreach (var reg in activeRegs)
        {
            var scores = tournament.Scores
                .Where(s => s.RegistrationId == reg.Id)
                .OrderBy(s => s.RoundNumber)
                .ThenBy(s => s.HoleNumber)
                .ToList();

            var thru = scores.Count(s => s.RoundNumber == tournament.CurrentRound);
            var gross = scores.Sum(s => s.GrossScore);
            var parSum = scores.Sum(s => s.Par);
            var toPar = thru > 0 ? gross - parSum : 0;
            var points = scores.Sum(s => s.Points);

            var eagles = scores.Count(s => s.GrossScore <= s.Par - 2);
            var birdies = scores.Count(s => s.GrossScore == s.Par - 1);
            var pars = scores.Count(s => s.GrossScore == s.Par);
            var bogeys = scores.Count(s => s.GrossScore == s.Par + 1);
            var doublePlus = scores.Count(s => s.GrossScore >= s.Par + 2);

            var playerHandicap = reg.HandicapIndex.HasValue ? (double)reg.HandicapIndex.Value : 0.0;
            var totalCourseHoles = totalHoles * roundsCount;
            var netAllowance = thru > 0 ? (int)Math.Round(playerHandicap * ((double)thru / totalHoles)) : (int)Math.Round(playerHandicap);
            var totalNet = Math.Max(0, gross - netAllowance);
            var netToPar = thru > 0 ? totalNet - parSum : 0;

            var roundGrossScores = new List<int>();
            for (int rn = 1; rn <= roundsCount; rn++)
            {
                var rScores = scores.Where(s => s.RoundNumber == rn).ToList();
                if (rScores.Count > 0)
                {
                    roundGrossScores.Add(rScores.Sum(s => s.GrossScore));
                }
            }

            var holeScores = scores.Select(s => new TournamentHoleScoreDto(
                s.HoleNumber,
                s.GrossScore,
                s.Par,
                s.Points,
                s.RoundNumber
            )).ToList();

            rows.Add(new TournamentLeaderboardRowDto(
                0, // populated after sorting
                reg.Id,
                reg.UserId,
                reg.GolferName,
                reg.HandicapIndex,
                reg.Flight,
                reg.MadeCut,
                thru,
                gross,
                toPar,
                totalNet,
                netToPar,
                points,
                eagles,
                birdies,
                pars,
                bogeys,
                doublePlus,
                reg.PairingGroup,
                reg.TeeTime,
                roundGrossScores,
                holeScores
            ));
        }

        // Sort based on format
        // MadeCut == null means no cut has been applied yet — treat as "still playing" (sort to top).
        // MadeCut == false means player missed cut — sort to bottom.
        // MadeCut == true  means player made cut — sort to top.
        if (tournament.Format == TournamentFormat.Stableford)
        {
            rows = rows
                .OrderBy(r => r.MadeCut == false ? 1 : 0)
                .ThenBy(r => r.ThruHoles == 0 ? 1 : 0)
                .ThenByDescending(r => r.StablefordPoints)
                .ThenBy(r => r.TotalGross)
                .ToList();
        }
        else
        {
            rows = rows
                .OrderBy(r => r.MadeCut == false ? 1 : 0)
                .ThenBy(r => r.ThruHoles == 0 ? 1 : 0)
                .ThenBy(r => r.ToPar)
                .ThenBy(r => r.TotalGross)
                .ToList();
        }

        var rankedRows = new List<TournamentLeaderboardRowDto>();
        for (int i = 0; i < rows.Count; i++)
        {
            var r = rows[i];
            rankedRows.Add(r with { Rank = i + 1 });
        }

        return rankedRows;
    }

    private static int CalculateStableford(int gross, int par)
    {
        var diff = gross - par;
        return diff switch
        {
            <= -3 => 5, // Albatross or better
            -2 => 4,    // Eagle
            -1 => 3,    // Birdie
            0 => 2,     // Par
            1 => 1,     // Bogey
            _ => 0      // Double bogey or worse
        };
    }
}
