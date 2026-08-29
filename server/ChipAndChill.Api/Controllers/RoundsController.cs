using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using System.Security.Claims;

namespace ChipAndChill.Api.Controllers;

public record CreateRoundRequest(Guid TenantId, DateTime PlayedOn, string TeeBox, List<RoundHoleInput> Holes, double CourseRating = 72.0, int SlopeRating = 113);
public record RoundHoleInput(int HoleNumber, int Par, int Strokes);
public record RoundResponse(Guid Id, Guid TenantId, DateTime PlayedOn, string TeeBox, double? HandicapDifferential, double CourseRating, int SlopeRating, List<RoundHoleInput> Holes);

[ApiController]
[Route("api/rounds")]
[Authorize]
public class RoundsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoundsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<Round>>> GetMine()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var rounds = await _db.Rounds
            .IgnoreQueryFilters()
            .Where(r => r.UserId == userId)
            .Include(r => r.Holes)
            .OrderByDescending(r => r.PlayedOn)
            .ToListAsync();

        return Ok(rounds.Select(r => new RoundResponse(
            r.Id,
            r.TenantId,
            r.PlayedOn,
            r.TeeBox,
            r.HandicapDifferential,
            r.CourseRating,
            r.SlopeRating,
            r.Holes.OrderBy(h => h.HoleNumber).Select(h => new RoundHoleInput(h.HoleNumber, h.Par, h.Strokes)).ToList())));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Round>> GetById(Guid id)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var round = await _db.Rounds.IgnoreQueryFilters()
            .Include(r => r.Holes)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (round == null) return NotFound();
        if (round.UserId != userId) return Forbid();
        return Ok(new RoundResponse(
            round.Id,
            round.TenantId,
            round.PlayedOn,
            round.TeeBox,
            round.HandicapDifferential,
            round.CourseRating,
            round.SlopeRating,
            round.Holes.OrderBy(h => h.HoleNumber).Select(h => new RoundHoleInput(h.HoleNumber, h.Par, h.Strokes)).ToList()));
    }

    [HttpPost]
    public async Task<ActionResult<Round>> Create(CreateRoundRequest req)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var tenantExists = await _db.Tenants.AnyAsync(t => t.Id == req.TenantId);
        if (!tenantExists) return BadRequest("Invalid course specified.");

        var round = new Round
        {
            TenantId = req.TenantId,
            UserId = userId.Value,
            PlayedOn = req.PlayedOn,
            TeeBox = req.TeeBox,
            CourseRating = req.CourseRating,
            SlopeRating = req.SlopeRating,
            Holes = req.Holes.Select(h => new RoundHole
            {
                HoleNumber = h.HoleNumber,
                Par = h.Par,
                Strokes = h.Strokes
            }).ToList()
        };

        _db.Rounds.Add(round);
        await _db.SaveChangesAsync();

        // WHS handicap differential: (Adjusted Gross Score − Course Rating) × 113 / Slope Rating.
        var totalStrokes = round.Holes.Sum(h => h.Strokes);
        var totalPar = round.Holes.Sum(h => h.Par);
        if (totalPar > 0 && req.SlopeRating > 0)
            round.HandicapDifferential = Math.Round((totalStrokes - req.CourseRating) * 113.0 / req.SlopeRating, 1);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = round.Id }, new RoundResponse(
            round.Id,
            round.TenantId,
            round.PlayedOn,
            round.TeeBox,
            round.HandicapDifferential,
            round.CourseRating,
            round.SlopeRating,
            round.Holes.Select(h => new RoundHoleInput(h.HoleNumber, h.Par, h.Strokes)).ToList()));
    }

    // GET /api/rounds/stats — aggregate stats + WHS handicap index for the caller.
    [HttpGet("stats")]
    public async Task<ActionResult<StatsResponse>> GetStats()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var rounds = await _db.Rounds
            .IgnoreQueryFilters()
            .Where(r => r.UserId == userId)
            .Include(r => r.Holes)
            .OrderBy(r => r.PlayedOn)
            .ToListAsync();

        if (rounds.Count == 0)
            return Ok(new StatsResponse(null, null, null, 0, null, new List<TrendPoint>(), new List<HoleStat>(), 0));

        // ---- WHS Handicap Index: average of best differentials from last 20
        // (scaled down for fewer rounds), × 0.96, truncated to 1 decimal.
        var differentials = rounds
            .Where(r => r.HandicapDifferential.HasValue && r.Holes.Count >= 9)
            .OrderByDescending(r => r.PlayedOn)
            .Take(20)
            .Select(r => r.HandicapDifferential!.Value)
            .OrderBy(d => d)
            .ToList();

        double? handicapIndex = null;
        if (differentials.Count > 0)
        {
            var useCount = differentials.Count switch
            {
                1 or 2 or 3 or 4 => 1,
                5 or 6 => 2,
                7 or 8 => differentials.Count == 7 ? 2 : 3,
                9 or 10 or 11 => differentials.Count == 9 ? 3 : 4,
                12 or 13 or 14 => differentials.Count == 12 ? 4 : 5,
                15 or 16 => 6,
                17 or 18 => 7,
                _ => 8
            };
            var avgBest = differentials.Take(useCount).Average();
            handicapIndex = Math.Floor(avgBest * 0.96 * 10) / 10;
        }

        // ---- Score trends (chronological)
        var trend = rounds.Select(r => new TrendPoint(
            r.PlayedOn,
            r.Holes.Sum(h => h.Strokes),
            r.Holes.Sum(h => h.Par),
            r.HandicapDifferential)).ToList();

        // ---- Hole performance across all rounds
        var holeStats = rounds
            .SelectMany(r => r.Holes)
            .GroupBy(h => h.HoleNumber)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var avgStrokes = g.Average(x => x.Strokes);
                var avgPar = g.Average(x => x.Par);
                var birdies = g.Count(x => x.Strokes == x.Par - 1);
                var pars = g.Count(x => x.Strokes == x.Par);
                var bogeys = g.Count(x => x.Strokes == x.Par + 1);
                var doublesOrWorse = g.Count(x => x.Strokes >= x.Par + 2);
                return new HoleStat(g.Key, Math.Round(avgStrokes, 2), Math.Round(avgPar, 1), birdies, pars, bogeys, doublesOrWorse);
            })
            .ToList();

        var scoresToPar = rounds.Select(r => r.Holes.Sum(h => h.Strokes) - r.Holes.Sum(h => h.Par)).ToList();
        var bestRound = rounds.OrderBy(r => r.Holes.Sum(h => h.Strokes) - r.Holes.Sum(h => h.Par)).First();

        return Ok(new StatsResponse(
            handicapIndex,
            Math.Round(rounds.Average(r => (double)r.Holes.Sum(h => h.Strokes)), 1),
            Math.Round(scoresToPar.Average(), 1),
            rounds.Count,
            new BestRoundInfo(bestRound.Id, bestRound.PlayedOn, bestRound.Holes.Sum(h => h.Strokes), bestRound.Holes.Sum(h => h.Par)),
            trend,
            holeStats,
            rounds.Count(r => r.Holes.Count == 18)));
    }
    private Guid? CurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}

