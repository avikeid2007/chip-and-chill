using Microsoft.AspNetCore.Identity;

namespace ChipAndChill.Api.Models;

public enum AppRole
{
    SuperAdmin,
    CourseAdmin,
    Staff,
    Golfer
}

// Extends ASP.NET Core Identity's user with our domain fields.
// TenantId is null for Golfers (they can book across many tenants);
// it's set for CourseAdmin/Staff, scoping them to one tenant.
public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public AppRole Role { get; set; } = AppRole.Golfer;
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public double? HandicapIndex { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

