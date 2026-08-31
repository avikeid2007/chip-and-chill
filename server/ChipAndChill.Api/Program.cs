using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ChipAndChill.Api;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Ensure User Secrets and Environment Variables are always loaded
builder.Configuration.AddUserSecrets("59647779-6d57-417f-9281-5d749a72efae");
builder.Configuration.AddEnvironmentVariables();

// ---- Database: switch provider via appsettings ("Database:Provider" = "SqlServer" | "MySql") ----
var dbProvider = builder.Configuration["Database:Provider"] ?? "SqlServer";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (dbProvider == "MySql")
    {
        var cs = builder.Configuration.GetConnectionString("MySql")
                 ?? builder.Configuration["ConnectionStrings:MySql"]
                 ?? throw new InvalidOperationException("Connection string 'MySql' was not found in configuration or user secrets.");
        options.UseMySql(cs, new MySqlServerVersion(new Version(8, 0, 36)), mySqlOptions =>
        {
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null);
        });
    }
    else
    {
        var cs = builder.Configuration.GetConnectionString("SqlServer")
                 ?? builder.Configuration["ConnectionStrings:SqlServer"];
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

// ---- CORS (allows Vite dev server and production host domains to call API with credentials/cookies) ----
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[]
{
    "http://localhost:5173",
    "http://localhost:5174",
    "https://chipandchill.in",
    "https://www.chipandchill.in",
    "http://chipandchill.in",
    "http://www.chipandchill.in"
};

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            try
            {
                var uri = new Uri(origin);
                return uri.Host == "localhost"
                    || uri.Host == "127.0.0.1"
                    || uri.Host == "chipandchill.in"
                    || uri.Host.EndsWith(".chipandchill.in")
                    || allowedOrigins.Contains(origin);
            }
            catch
            {
                return false;
            }
        })
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
        // Prevent JSON object cycle serialization loops
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ---- Email & SMS Notification Services ----
builder.Services.AddHttpClient();
builder.Services.Configure<ChipAndChill.Api.Services.EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<ChipAndChill.Api.Services.IEmailSender, ChipAndChill.Api.Services.EmailSender>();
builder.Services.AddScoped<ChipAndChill.Api.Services.ITenantNotificationService, ChipAndChill.Api.Services.TenantNotificationService>();

// ---- Pricing Rules & Payments Services ----
builder.Services.AddScoped<ChipAndChill.Api.Services.IPricingEngine, ChipAndChill.Api.Services.PricingEngine>();
builder.Services.AddScoped<ChipAndChill.Api.Services.IPaymentService, ChipAndChill.Api.Services.StripePaymentService>();

// ---- Tee Slot Schedule & Automated Generation Services ----
builder.Services.AddScoped<ChipAndChill.Api.Services.ITeeSlotGeneratorService, ChipAndChill.Api.Services.TeeSlotGeneratorService>();
builder.Services.AddHostedService<ChipAndChill.Api.Services.TeeSlotAutoGeneratorHostedService>();
builder.Services.AddHostedService<ChipAndChill.Api.Services.TeeTimeReminderHostedService>();

// ---- Live Satellite Weather Service ----
builder.Services.AddScoped<ChipAndChill.Api.Services.IWeatherService, ChipAndChill.Api.Services.OpenMeteoWeatherService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Chip & Chill Golf Platform API",
        Version = "v1",
        Description = "Multi-Tenant Golf Course & Driving Range Management Platform API"
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid JWT token.\r\n\r\nExample: \"Bearer eyJhbGciOi...\""
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});


var app = builder.Build();

// Automatically apply any pending EF Core database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Could not automatically apply pending database migrations on startup.");
    }

    // Ensure new Tenant fee, reminder, and notification columns exist in database
    string[] alterStatements = new[]
    {
        "ALTER TABLE `Tenants` ADD `GreenFee` decimal(18,2) NULL;",
        "ALTER TABLE `Tenants` ADD `CaddieFee` decimal(18,2) NULL;",
        "ALTER TABLE `Tenants` ADD `CoachFee` decimal(18,2) NULL;",
        "ALTER TABLE `Tenants` ADD `HolesCount` int NOT NULL DEFAULT 18;",
        "ALTER TABLE `Bookings` ADD `ReminderSentAt` datetime NULL;",
        "ALTER TABLE `TenantNotificationSettings` ADD `UseCustomWhatsApp` tinyint(1) NOT NULL DEFAULT 0;",
        "ALTER TABLE `TenantNotificationSettings` ADD `WhatsAppProvider` varchar(50) NOT NULL DEFAULT 'TwilioWhatsApp';",
        "ALTER TABLE `TenantNotificationSettings` ADD `WhatsAppFromNumber` varchar(100) NULL;",
        "ALTER TABLE `TenantNotificationSettings` ADD `SendBookingConfirmationWhatsApp` tinyint(1) NOT NULL DEFAULT 0;",
        "ALTER TABLE `TenantNotificationSettings` ADD `SendPaymentReceiptEmail` tinyint(1) NOT NULL DEFAULT 1;",
        "ALTER TABLE `TenantNotificationSettings` ADD `SendPaymentReceiptWhatsApp` tinyint(1) NOT NULL DEFAULT 0;",
        "ALTER TABLE `TenantNotificationSettings` ADD `SendReminderWhatsApp` tinyint(1) NOT NULL DEFAULT 0;"
    };
    foreach (var sql in alterStatements)
    {
        try
        {
            db.Database.ExecuteSqlRaw(sql);
        }
        catch
        {
            // Column already exists - ignore duplicate column error
        }
    }
}

// Enable Swagger in all environments (Development & Production)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Chip & Chill API v1");
    c.RoutePrefix = "swagger";
});

// CORS MUST be first before HTTPS redirection and static files to ensure preflights succeed
app.UseCors();

app.UseHttpsRedirection();
app.UseStaticFiles(); // serves uploaded logos from wwwroot/uploads
app.UseAuthentication();

// Resolves the current tenant (header or subdomain) before authorization/
// controllers run, so EF Core's query filters are scoped correctly.
app.UseMiddleware<TenantMiddleware>();

app.UseAuthorization();
app.MapControllers();

app.Run();

