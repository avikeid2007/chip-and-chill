using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.DTOs;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using ChipAndChill.Api.Services;

namespace ChipAndChill.Api.Controllers;

[ApiController]
[Route("api/tenants/{tenantId:guid}")]
public class PricingRulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPricingEngine _pricingEngine;

    public PricingRulesController(AppDbContext db, IPricingEngine pricingEngine)
    {
        _db = db;
        _pricingEngine = pricingEngine;
    }

    [HttpGet("pricing-rules")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<IEnumerable<PricingRuleResponse>>> GetRules(Guid tenantId)
    {
        var rules = await _db.PricingRules
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.Priority)
            .ThenBy(r => r.Name)
            .ToListAsync();

        return Ok(rules.Select(r => new PricingRuleResponse(
            r.Id,
            r.TenantId,
            r.Name,
            r.Days,
            r.StartTime?.ToString("HH:mm"),
            r.EndTime?.ToString("HH:mm"),
            r.Price,
            r.Priority,
            r.IsActive,
            r.CreatedAt)));
    }

    [HttpPost("pricing-rules")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<ActionResult<PricingRuleResponse>> CreateRule(Guid tenantId, CreatePricingRuleRequest req)
    {
        TimeOnly? start = null;
        TimeOnly? end = null;

        if (!string.IsNullOrWhiteSpace(req.StartTime) && TimeOnly.TryParse(req.StartTime, out var parsedStart))
            start = parsedStart;

        if (!string.IsNullOrWhiteSpace(req.EndTime) && TimeOnly.TryParse(req.EndTime, out var parsedEnd))
            end = parsedEnd;

        var rule = new PricingRule
        {
            TenantId = tenantId,
            Name = req.Name,
            Days = req.Days,
            StartTime = start,
            EndTime = end,
            Price = req.Price,
            Priority = req.Priority,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.PricingRules.Add(rule);
        await _db.SaveChangesAsync();

        var response = new PricingRuleResponse(
            rule.Id,
            rule.TenantId,
            rule.Name,
            rule.Days,
            rule.StartTime?.ToString("HH:mm"),
            rule.EndTime?.ToString("HH:mm"),
            rule.Price,
            rule.Priority,
            rule.IsActive,
            rule.CreatedAt);

        return CreatedAtAction(nameof(GetRules), new { tenantId }, response);
    }

    [HttpPut("pricing-rules/{id:guid}")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> UpdateRule(Guid tenantId, Guid id, UpdatePricingRuleRequest req)
    {
        var rule = await _db.PricingRules
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null) return NotFound();

        if (req.Name != null) rule.Name = req.Name;
        if (req.Days.HasValue) rule.Days = req.Days.Value;
        if (req.Price.HasValue) rule.Price = req.Price.Value;
        if (req.Priority.HasValue) rule.Priority = req.Priority.Value;
        if (req.IsActive.HasValue) rule.IsActive = req.IsActive.Value;

        if (req.StartTime != null)
        {
            rule.StartTime = string.IsNullOrWhiteSpace(req.StartTime)
                ? null
                : TimeOnly.TryParse(req.StartTime, out var parsedStart) ? parsedStart : rule.StartTime;
        }

        if (req.EndTime != null)
        {
            rule.EndTime = string.IsNullOrWhiteSpace(req.EndTime)
                ? null
                : TimeOnly.TryParse(req.EndTime, out var parsedEnd) ? parsedEnd : rule.EndTime;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("pricing-rules/{id:guid}")]
    [Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
    [TenantScoped]
    public async Task<IActionResult> DeleteRule(Guid tenantId, Guid id)
    {
        var rule = await _db.PricingRules
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (rule == null) return NotFound();

        _db.PricingRules.Remove(rule);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("pricing/preview")]
    [AllowAnonymous]
    public async Task<ActionResult<PricePreviewResponse>> PreviewPrice(Guid tenantId, PricePreviewRequest req)
    {
        var basePrice = req.BasePrice ?? 50.00m;
        var (calculatedPrice, matchedRule) = await _pricingEngine.EvaluateRuleAsync(tenantId, req.SlotTime, basePrice);

        return Ok(new PricePreviewResponse(
            req.SlotTime,
            calculatedPrice,
            basePrice,
            matchedRule?.Id,
            matchedRule?.Name));
    }
}
