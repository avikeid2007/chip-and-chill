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
    private readonly IEmailSender _emailSender;

    public TournamentsController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender)
    {
        _db = db;
        _userManager = userManager;
        _emailSender = emailSender;
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
            t.CreatedAt
        )));
    }

    // GET /api/tenants/{tenantId}/tournaments/{id}
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentDetailResponse>> GetTournament(Guid tenantId, Guid id)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId && t.Id == id)
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
            tournament.CreatedAt
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

        if (tournament.Status != TournamentStatus.Upcoming && tournament.Status != TournamentStatus.InProgress)
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
            Status = TournamentRegistrationStatus.Registered,
            PaymentStatus = isFree ? TournamentPaymentStatus.Free : TournamentPaymentStatus.Unpaid,
            AmountPaid = isFree ? 0m : 0m,
            RegisteredAt = DateTime.UtcNow
        };

        _db.TournamentRegistrations.Add(reg);
        await _db.SaveChangesAsync();

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/registrations/{regId}/confirm-sandbox-payment
    [HttpPost("{id:guid}/registrations/{regId:guid}/confirm-sandbox-payment")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentRegistrationDto>> ConfirmSandboxPayment(Guid tenantId, Guid id, Guid regId)
    {
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .Include(r => r.Tournament)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == regId);

        if (reg == null) return NotFound("Registration not found.");

        reg.PaymentStatus = TournamentPaymentStatus.Paid;
        reg.AmountPaid = reg.Tournament?.EntryFee ?? 0m;
        reg.PaymentIntentId = $"sandbox_tourn_{Guid.NewGuid():N}";
        reg.Status = TournamentRegistrationStatus.Confirmed;

        await _db.SaveChangesAsync();

        return Ok(new TournamentRegistrationDto(
            reg.Id,
            reg.TournamentId,
            reg.UserId,
            reg.GolferName,
            reg.GolferEmail,
            reg.HandicapIndex,
            reg.Status,
            reg.PaymentStatus,
            reg.AmountPaid,
            reg.PairingGroup,
            reg.TeeTime,
            reg.RegisteredAt
        ));
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/generate-pairings
    [HttpPost("{id:guid}/generate-pairings")]
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
            .OrderBy(r => r.HandicapIndex ?? 54)
            .ToList();

        if (activeRegs.Count == 0)
            return BadRequest("No active registrations to pair.");

        var playersPerGroup = Math.Max(1, req.PlayersPerGroup);
        var interval = Math.Max(5, req.IntervalMinutes);
        var startTime = req.FirstTeeTime ?? tournament.StartDate;

        var currentGroup = 1;
        var groupCounter = 0;
        var currentTeeTime = startTime;

        foreach (var reg in activeRegs)
        {
            reg.PairingGroup = currentGroup;
            reg.TeeTime = currentTeeTime;
            groupCounter++;

            if (groupCounter >= playersPerGroup)
            {
                currentGroup++;
                groupCounter = 0;
                currentTeeTime = currentTeeTime.AddMinutes(interval);
            }
        }

        await _db.SaveChangesAsync();

        return Ok(activeRegs.Select(r => new TournamentRegistrationDto(
            r.Id,
            r.TournamentId,
            r.UserId,
            r.GolferName,
            r.GolferEmail,
            r.HandicapIndex,
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
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == req.RegistrationId);

        if (reg == null) return NotFound("Registration not found.");

        var existing = await _db.TournamentScores
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TournamentId == id && s.RegistrationId == req.RegistrationId && s.HoleNumber == req.HoleNumber);

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
                HoleNumber = req.HoleNumber,
                GrossScore = req.GrossScore,
                Par = req.Par,
                Points = points,
                EnteredAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // POST /api/tenants/{tenantId}/tournaments/{id}/scores/batch
    [HttpPost("{id:guid}/scores/batch")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> BatchPostScores(Guid tenantId, Guid id, BatchPostTournamentScoresRequest req)
    {
        var reg = await _db.TournamentRegistrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.TournamentId == id && r.Id == req.RegistrationId);

        if (reg == null) return NotFound("Registration not found.");

        foreach (var item in req.Scores)
        {
            var existing = await _db.TournamentScores
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TournamentId == id && s.RegistrationId == req.RegistrationId && s.HoleNumber == item.HoleNumber);

            var points = CalculateStableford(item.GrossScore, item.Par);

            if (existing != null)
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
                    HoleNumber = item.HoleNumber,
                    GrossScore = item.GrossScore,
                    Par = item.Par,
                    Points = points,
                    EnteredAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // GET /api/tenants/{tenantId}/tournaments/{id}/leaderboard
    [HttpGet("{id:guid}/leaderboard")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TournamentLeaderboardRowDto>>> GetLeaderboard(Guid tenantId, Guid id)
    {
        var tournament = await _db.Tournaments
            .IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId && t.Id == id)
            .Include(t => t.Registrations)
            .Include(t => t.Scores)
            .FirstOrDefaultAsync();

        if (tournament == null) return NotFound("Tournament not found.");

        return Ok(ComputeLeaderboard(tournament));
    }

    private static IEnumerable<TournamentLeaderboardRowDto> ComputeLeaderboard(Tournament tournament)
    {
        var rows = new List<TournamentLeaderboardRowDto>();

        var activeRegs = tournament.Registrations
            .Where(r => r.Status != TournamentRegistrationStatus.Withdrawn)
            .ToList();

        foreach (var reg in activeRegs)
        {
            var scores = tournament.Scores
                .Where(s => s.RegistrationId == reg.Id)
                .OrderBy(s => s.HoleNumber)
                .ToList();

            var thru = scores.Count;
            var gross = scores.Sum(s => s.GrossScore);
            var parSum = scores.Sum(s => s.Par);
            var toPar = gross - parSum;
            var points = scores.Sum(s => s.Points);

            var eagles = scores.Count(s => s.GrossScore <= s.Par - 2);
            var birdies = scores.Count(s => s.GrossScore == s.Par - 1);
            var pars = scores.Count(s => s.GrossScore == s.Par);
            var bogeys = scores.Count(s => s.GrossScore == s.Par + 1);
            var doublePlus = scores.Count(s => s.GrossScore >= s.Par + 2);

            rows.Add(new TournamentLeaderboardRowDto(
                0, // populated after sorting
                reg.Id,
                reg.UserId,
                reg.GolferName,
                reg.HandicapIndex,
                thru,
                gross,
                toPar,
                points,
                eagles,
                birdies,
                pars,
                bogeys,
                doublePlus,
                reg.PairingGroup,
                reg.TeeTime
            ));
        }

        // Sort based on tournament format
        if (tournament.Format == TournamentFormat.Stableford)
        {
            // Stableford: highest points first
            rows = rows.OrderByDescending(r => r.StablefordPoints).ThenBy(r => r.TotalGross).ToList();
        }
        else
        {
            // Stroke Play & Scramble: lowest to-par first (active players with scores first, then unstarted)
            rows = rows
                .OrderBy(r => r.ThruHoles == 0 ? 1 : 0)
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
