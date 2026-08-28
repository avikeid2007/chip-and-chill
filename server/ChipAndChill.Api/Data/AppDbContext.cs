using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    // Set by middleware from the authenticated user's TenantId (or a resolved
    // tenant from subdomain/header for anonymous browsing). Null means "no
    // tenant filter" (e.g. Super Admin, or public cross-tenant endpoints).
    public Guid? CurrentTenantId { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<CourseHole> CourseHoles => Set<CourseHole>();
    public DbSet<TeeSlot> TeeSlots => Set<TeeSlot>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Round> Rounds => Set<Round>();
    public DbSet<RoundHole> RoundHoles => Set<RoundHole>();
    public DbSet<WaitlistEntry> WaitlistEntries => Set<WaitlistEntry>();
    public DbSet<PricingRule> PricingRules => Set<PricingRule>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentRegistration> TournamentRegistrations => Set<TournamentRegistration>();
    public DbSet<TournamentScore> TournamentScores => Set<TournamentScore>();
    public DbSet<RangeBay> RangeBays => Set<RangeBay>();
    public DbSet<BayBooking> BayBookings => Set<BayBooking>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Global query filters scope every tenant-owned row to CurrentTenantId
        // when it's set, so a single query can't accidentally leak across tenants.
        builder.Entity<CourseHole>().HasQueryFilter(h => CurrentTenantId == null || h.TenantId == CurrentTenantId);
        builder.Entity<TeeSlot>().HasQueryFilter(s => CurrentTenantId == null || s.TenantId == CurrentTenantId);
        builder.Entity<Booking>().HasQueryFilter(b => CurrentTenantId == null || b.TenantId == CurrentTenantId);
        builder.Entity<Round>().HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);
        builder.Entity<PricingRule>().HasQueryFilter(p => CurrentTenantId == null || p.TenantId == CurrentTenantId);
        builder.Entity<Tournament>().HasQueryFilter(t => CurrentTenantId == null || t.TenantId == CurrentTenantId);
        builder.Entity<TournamentRegistration>().HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);
        builder.Entity<TournamentScore>().HasQueryFilter(s => CurrentTenantId == null || s.TenantId == CurrentTenantId);
        builder.Entity<RangeBay>().HasQueryFilter(rb => CurrentTenantId == null || rb.TenantId == CurrentTenantId);
        builder.Entity<BayBooking>().HasQueryFilter(bb => CurrentTenantId == null || bb.TenantId == CurrentTenantId);

        builder.Entity<Tenant>()
            .HasIndex(t => t.Subdomain)
            .IsUnique();

        builder.Entity<Tenant>()
            .HasIndex(t => t.CustomDomain);

        builder.Entity<CourseHole>()
            .HasIndex(h => new { h.TenantId, h.HoleNumber })
            .IsUnique();

        builder.Entity<Round>()
            .HasMany(r => r.Holes)
            .WithOne(h => h.Round)
            .HasForeignKey(h => h.RoundId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<WaitlistEntry>()
            .HasQueryFilter(w => CurrentTenantId == null || w.TenantId == CurrentTenantId);

        builder.Entity<WaitlistEntry>()
            .HasOne(w => w.TeeSlot)
            .WithMany()
            .HasForeignKey(w => w.TeeSlotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<TeeSlot>()
            .HasMany(s => s.Bookings)
            .WithOne(b => b.TeeSlot)
            .HasForeignKey(b => b.TeeSlotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Tournament>()
            .HasMany(t => t.Registrations)
            .WithOne(r => r.Tournament)
            .HasForeignKey(r => r.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Tournament>()
            .HasMany(t => t.Scores)
            .WithOne(s => s.Tournament)
            .HasForeignKey(s => s.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<TournamentRegistration>()
            .HasMany(r => r.Scores)
            .WithOne(s => s.Registration)
            .HasForeignKey(s => s.RegistrationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<RangeBay>()
            .HasMany(b => b.Bookings)
            .WithOne(bk => bk.RangeBay)
            .HasForeignKey(bk => bk.RangeBayId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Booking>()
            .Property(b => b.Status)
            .HasConversion<string>();

        builder.Entity<Booking>()
            .Property(b => b.PaymentStatus)
            .HasConversion<string>();

        builder.Entity<PricingRule>()
            .Property(p => p.Days)
            .HasConversion<string>();

        builder.Entity<Tenant>()
            .Property(t => t.Type)
            .HasConversion<string>();

        builder.Entity<ApplicationUser>()
            .Property(u => u.Role)
            .HasConversion<string>();

        builder.Entity<Tournament>()
            .Property(t => t.Format)
            .HasConversion<string>();

        builder.Entity<Tournament>()
            .Property(t => t.Status)
            .HasConversion<string>();

        builder.Entity<TournamentRegistration>()
            .Property(r => r.Status)
            .HasConversion<string>();

        builder.Entity<TournamentRegistration>()
            .Property(r => r.PaymentStatus)
            .HasConversion<string>();

        builder.Entity<BayBooking>()
            .Property(b => b.Status)
            .HasConversion<string>();

        builder.Entity<BayBooking>()
            .Property(b => b.PaymentStatus)
            .HasConversion<string>();

        builder.Entity<RefreshToken>()
            .HasIndex(r => r.Token)
            .IsUnique();

        builder.Entity<RefreshToken>()
            .HasIndex(r => r.UserId);

        builder.Entity<RefreshToken>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}


