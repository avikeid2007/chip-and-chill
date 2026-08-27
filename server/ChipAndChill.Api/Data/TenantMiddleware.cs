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
            var subdomain = host.Split('.').FirstOrDefault();
            if (!string.IsNullOrEmpty(subdomain) && subdomain != "www" && subdomain != "api")
            {
                var tenant = db.Tenants.FirstOrDefault(t => t.Subdomain == subdomain);
                if (tenant != null) db.CurrentTenantId = tenant.Id;
            }
        }

        await _next(context);
    }
}

