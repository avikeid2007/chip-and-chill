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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Global query filters scope every tenant-owned row to CurrentTenantId
        // when it's set, so a single query can't accidentally leak across tenants.
        builder.Entity<CourseHole>().HasQueryFilter(h => CurrentTenantId == null || h.TenantId == CurrentTenantId);
        builder.Entity<TeeSlot>().HasQueryFilter(s => CurrentTenantId == null || s.TenantId == CurrentTenantId);
        builder.Entity<Booking>().HasQueryFilter(b => CurrentTenantId == null || b.TenantId == CurrentTenantId);
        builder.Entity<Round>().HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);

        builder.Entity<Tenant>()
            .HasIndex(t => t.Subdomain)
            .IsUnique();

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

        builder.Entity<Booking>()
            .Property(b => b.Status)
            .HasConversion<string>();

        builder.Entity<Tenant>()
            .Property(t => t.Type)
            .HasConversion<string>();

        builder.Entity<ApplicationUser>()
            .Property(u => u.Role)
            .HasConversion<string>();
    }
}

