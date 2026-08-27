using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ChipAndChill.Api.Security;

// Prevents cross-tenant access: the {tenantId} (or other named) route value must
// match the caller's "tenant_id" JWT claim. SuperAdmin bypasses this check.
// Without this, a valid CourseAdmin/Staff JWT for one tenant could act on any
// other tenant's data just by changing the tenantId in the URL.
public class TenantScopedAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _routeParam;

    public TenantScopedAttribute(string routeParam = "tenantId")
    {
        _routeParam = routeParam;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        if (user.IsInRole("SuperAdmin"))
        {
            await next();
            return;
        }

        if (!context.RouteData.Values.TryGetValue(_routeParam, out var routeValue)
            || !Guid.TryParse(routeValue?.ToString(), out var routeTenantId))
        {
            context.Result = new BadRequestObjectResult($"Missing or invalid route value '{_routeParam}'.");
            return;
        }

        var tenantClaim = user.FindFirst("tenant_id")?.Value;
        if (tenantClaim == null || !Guid.TryParse(tenantClaim, out var userTenantId) || userTenantId != routeTenantId)
        {
            context.Result = new ObjectResult("You do not have access to this tenant's resources.") { StatusCode = 403 };
            return;
        }

        await next();
    }
}
