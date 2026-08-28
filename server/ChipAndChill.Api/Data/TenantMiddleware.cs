using ChipAndChill.Api.Data;

namespace ChipAndChill.Api;

// Resolves the tenant for the current request and sets it on the DbContext
// so EF Core's global query filters scope every query automatically.
// Resolution order: X-Tenant-Id header (used by the SPA) > subdomain > none.
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerValue)
            && Guid.TryParse(headerValue, out var tenantId))
        {
            db.CurrentTenantId = tenantId;
        }
        else
        {
            var host = context.Request.Host.Host;
            if (!string.IsNullOrEmpty(host) && host != "localhost" && host != "127.0.0.1")
            {
                var lowerHost = host.ToLowerInvariant();

                // 1. Direct match on CustomDomain (e.g., "pinehillgolf.com" or "play.pinehill.com")
                var customTenant = db.Tenants.FirstOrDefault(t => t.CustomDomain != null && t.CustomDomain.ToLower() == lowerHost);
                if (customTenant != null)
                {
                    db.CurrentTenantId = customTenant.Id;
                }
                else
                {
                    // 2. Subdomain check (e.g., "pinehill.chipandchill.com" -> "pinehill")
                    var parts = lowerHost.Split('.');
                    if (parts.Length > 1)
                    {
                        var subdomain = parts[0];
                        if (subdomain != "www" && subdomain != "api" && subdomain != "app")
                        {
                            var tenant = db.Tenants.FirstOrDefault(t => t.Subdomain != null && t.Subdomain.ToLower() == subdomain);
                            if (tenant != null) db.CurrentTenantId = tenant.Id;
                        }
                    }
                }
            }
        }

        await _next(context);
    }
}

