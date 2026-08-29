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

    // Golfer Passport & Detailed Profile Fields
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? HomeClubName { get; set; }

    // Game Specs & Preferences
    public string? Handedness { get; set; } = "Right-Handed"; // "Right-Handed" | "Left-Handed"
    public string? PreferredTee { get; set; } = "White";      // "Black" | "Blue" | "White" | "Gold" | "Red"
    public string? AverageScore { get; set; }                // "Under 80" | "80-89" | "90-99" | "100+"
    public string? PlayFrequency { get; set; }               // "Weekly" | "Bi-weekly" | "Monthly" | "Casual"

    // In The Bag (Equipment)
    public string? Driver { get; set; }
    public string? Irons { get; set; }
    public string? Putter { get; set; }
    public string? GolfBall { get; set; }

    // Safety & Emergency
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }

    // Notification Preferences
    public bool SmsAlertsEnabled { get; set; } = true;
    public bool MarketingEnabled { get; set; } = false;
}

