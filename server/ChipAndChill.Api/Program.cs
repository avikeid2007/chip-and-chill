using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ChipAndChill.Api;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ---- Database: switch provider via appsettings ("Database:Provider" = "SqlServer" | "MySql") ----
var dbProvider = builder.Configuration["Database:Provider"] ?? "SqlServer";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (dbProvider == "MySql")
    {
        var cs = builder.Configuration.GetConnectionString("MySql");
        options.UseMySql(cs, ServerVersion.AutoDetect(cs));
    }
    else
    {
        var cs = builder.Configuration.GetConnectionString("SqlServer");
        options.UseSqlServer(cs);
    }
});

// ---- Identity ----
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ---- JWT Auth ----
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ChipAndChill",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ChipAndChillUsers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ---- CORS (allows the Vite dev server / hosted frontend to call the API with credentials/cookies) ----
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173", "http://localhost:5174" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Accept and emit enums as strings ("Golfer", "CourseAdmin", "Confirmed"...)
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// ---- Email & SMS Notification Services ----
builder.Services.AddHttpClient();
builder.Services.Configure<ChipAndChill.Api.Services.EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<ChipAndChill.Api.Services.IEmailSender, ChipAndChill.Api.Services.EmailSender>();
builder.Services.AddScoped<ChipAndChill.Api.Services.ITenantNotificationService, ChipAndChill.Api.Services.TenantNotificationService>();

// ---- Pricing Rules & Payments Services ----
builder.Services.AddScoped<ChipAndChill.Api.Services.IPricingEngine, ChipAndChill.Api.Services.PricingEngine>();
builder.Services.AddScoped<ChipAndChill.Api.Services.IPaymentService, ChipAndChill.Api.Services.StripePaymentService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // serves uploaded logos from wwwroot/uploads
app.UseCors();
app.UseAuthentication();

// Resolves the current tenant (header or subdomain) before authorization/
// controllers run, so EF Core's query filters are scoped correctly.
app.UseMiddleware<TenantMiddleware>();

app.UseAuthorization();
app.MapControllers();

app.Run();

