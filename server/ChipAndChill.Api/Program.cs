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
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ---- CORS (allows the Vite dev server / hosted frontend to call the API) ----
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Accept and emit enums as strings ("Golfer", "CourseAdmin", "Confirmed"...)
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// ---- Email (pluggable: Console for dev, Smtp/SendGrid via config) ----
builder.Services.Configure<ChipAndChill.Api.Services.EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<ChipAndChill.Api.Services.IEmailSender, ChipAndChill.Api.Services.EmailSender>();
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

