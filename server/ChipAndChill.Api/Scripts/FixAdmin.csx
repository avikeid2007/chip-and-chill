// One-off script: links the existing Course Admin account to the Pine Hollow tenant.
// Usage: dotnet script fixadmin.csx  (or run via the API once the Create-tenant fix is live)
using Microsoft.EntityFrameworkCore;

var connectionString = "Server=140.238.253.216;Port=3306;Database=openGolfDev;User=avi;Password=Xavi@1234;CharSet=utf8mb4";
var adminEmail = "admin@pinehollow.test";
var tenantId = Guid.Parse("3f6437e2-ddd9-494f-a11b-8ace7168ef08");

var options = new DbContextOptionsBuilder<OpenGolf.Api.Data.AppDbContext>()
    .UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
    .Options;

using var db = new OpenGolf.Api.Data.AppDbContext(options);
var user = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
if (user == null) { Console.WriteLine("User not found"); return; }

user.TenantId = tenantId;
user.Role = OpenGolf.Api.Models.AppRole.CourseAdmin;
await db.SaveChangesAsync();
Console.WriteLine($"Linked {adminEmail} to tenant {tenantId}");
