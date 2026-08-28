using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;

namespace ChipAndChill.Api.Services;

public interface ITenantNotificationService
{
    Task SendBookingConfirmationAsync(Guid tenantId, Booking booking, ApplicationUser? user, TeeSlot? slot);
    Task SendBookingCancellationAsync(Guid tenantId, Booking booking, ApplicationUser? user, decimal refundAmount);
    Task SendTournamentRegistrationAsync(Guid tenantId, TournamentRegistration reg, Tournament tournament);
    Task SendBayBookingConfirmationAsync(Guid tenantId, BayBooking booking, ApplicationUser? user, RangeBay? bay);
    Task SendPasswordResetEmailAsync(ApplicationUser user, string resetLink, Guid? preferredTenantId = null);
    Task<TestNotificationResult> SendTestEmailAsync(Guid tenantId, string targetEmail, TenantNotificationSettings? customSettings = null);
    Task<TestNotificationResult> SendTestSmsAsync(Guid tenantId, string targetPhone, TenantNotificationSettings? customSettings = null);
}

public record TestNotificationResult(bool Success, string Message);

public class TenantNotificationService : ITenantNotificationService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _defaultEmailSender;
    private readonly EmailOptions _defaultEmailOptions;
    private readonly ILogger<TenantNotificationService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public TenantNotificationService(
        AppDbContext db,
        IEmailSender defaultEmailSender,
        IOptions<EmailOptions> defaultEmailOptions,
        ILogger<TenantNotificationService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _defaultEmailSender = defaultEmailSender;
        _defaultEmailOptions = defaultEmailOptions.Value;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendBookingConfirmationAsync(Guid tenantId, Booking booking, ApplicationUser? user, TeeSlot? slot)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        var settings = await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

        var courseName = tenant?.Name ?? "OpenGolf";
        var currency = tenant?.CurrencySymbol ?? "₹";
        var startTimeStr = slot != null ? slot.StartTime.ToString("f") : "Upcoming";
        var totalPrice = slot != null ? slot.Price * booking.PartySize : booking.AmountPaid;

        // 1. Email Notification
        if (settings == null || settings.SendBookingConfirmationEmail)
        {
            var subject = $"Tee Time Confirmed — {courseName}";
            var sb = new StringBuilder();
            sb.AppendLine($"Hi {user.FirstName},");
            sb.AppendLine();
            sb.AppendLine($"Your tee time reservation at {courseName} is confirmed!");
            sb.AppendLine($"• Date & Time: {startTimeStr} (UTC)");
            sb.AppendLine($"• Players: {booking.PartySize}");
            sb.AppendLine($"• Total Amount: {currency}{totalPrice:F2}");
            sb.AppendLine($"• Booking Reference: {booking.Id.ToString()[..8].ToUpperInvariant()}");

            if (!string.IsNullOrWhiteSpace(settings?.CustomDressCodePolicy))
            {
                sb.AppendLine();
                sb.AppendLine($"Dress Code & Club Rules:\n{settings.CustomDressCodePolicy}");
            }

            if (!string.IsNullOrWhiteSpace(settings?.CustomDirectionsNotes))
            {
                sb.AppendLine();
                sb.AppendLine($"Directions & Parking:\n{settings.CustomDirectionsNotes}");
            }

            if (!string.IsNullOrWhiteSpace(settings?.CustomEmailFooter))
            {
                sb.AppendLine();
                sb.AppendLine(settings.CustomEmailFooter);
            }
            else
            {
                sb.AppendLine();
                sb.AppendLine($"See you on the green!\n— {courseName} & Chip and Chill");
            }

            await DispatchEmailAsync(settings, tenant, user.Email, subject, sb.ToString());
        }

        // 2. SMS Notification
        if (settings != null && settings.SendBookingConfirmationSms && !string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            var smsBody = $"{courseName}: Tee time confirmed for {startTimeStr} ({booking.PartySize} players). Ref: {booking.Id.ToString()[..8].ToUpperInvariant()}";
            await DispatchSmsAsync(settings, user.PhoneNumber, smsBody);
        }
    }

    public async Task SendBookingCancellationAsync(Guid tenantId, Booking booking, ApplicationUser? user, decimal refundAmount)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        var settings = await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (settings != null && !settings.SendCancellationNotice) return;

        var courseName = tenant?.Name ?? "OpenGolf";
        var currency = tenant?.CurrencySymbol ?? "₹";

        var subject = $"Booking Cancelled — {courseName}";
        var body = $"Hi {user.FirstName},\n\n" +
                   $"Your booking at {courseName} has been cancelled.\n" +
                   (refundAmount > 0 ? $"A refund of {currency}{refundAmount:F2} has been processed.\n\n" : "\n") +
                   $"We hope to welcome you back soon!\n— {courseName}";

        await DispatchEmailAsync(settings, tenant, user.Email, subject, body);

        if (settings != null && settings.SendBookingConfirmationSms && !string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            var smsBody = $"{courseName}: Booking cancelled." + (refundAmount > 0 ? $" Refund {currency}{refundAmount:F2} processed." : "");
            await DispatchSmsAsync(settings, user.PhoneNumber, smsBody);
        }
    }

    public async Task SendTournamentRegistrationAsync(Guid tenantId, TournamentRegistration reg, Tournament tournament)
    {
        var email = reg.GolferEmail;
        if (string.IsNullOrWhiteSpace(email)) return;

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        var settings = await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

        var courseName = tenant?.Name ?? "OpenGolf";
        var subject = $"Tournament Entry Confirmed — {tournament.Name}";
        var body = $"Hi {reg.GolferName},\n\n" +
                   $"You're registered for {tournament.Name} at {courseName}!\n" +
                   $"• Date: {tournament.StartDate:D}\n" +
                   $"• Format: {tournament.Format}\n" +
                   $"• Status: {reg.Status}\n\n" +
                   $"Good luck on tournament day!\n— {courseName}";

        await DispatchEmailAsync(settings, tenant, email, subject, body);
    }

    public async Task SendBayBookingConfirmationAsync(Guid tenantId, BayBooking booking, ApplicationUser? user, RangeBay? bay)
    {
        var email = user?.Email ?? booking.GolferEmail;
        if (string.IsNullOrWhiteSpace(email)) return;

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        var settings = await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

        var courseName = tenant?.Name ?? "Driving Range";
        var bayName = bay?.Name ?? $"Bay #{bay?.BayNumber}";
        var currency = tenant?.CurrencySymbol ?? "₹";

        var subject = $"Range Bay Confirmed — {courseName}";
        var body = $"Hi {booking.GolferName},\n\n" +
                   $"Your driving range bay reservation is confirmed!\n" +
                   $"• Facility: {courseName}\n" +
                   $"• Bay: {bayName}\n" +
                   $"• Time: {booking.StartTime:f}\n" +
                   $"• Duration: {booking.DurationMinutes} minutes\n" +
                   $"• Total: {currency}{booking.Price:F2}\n\n" +
                   $"Have a great practice session!\n— {courseName}";

        await DispatchEmailAsync(settings, tenant, email, subject, body);
    }

    public async Task SendPasswordResetEmailAsync(ApplicationUser user, string resetLink, Guid? preferredTenantId = null)
    {
        if (string.IsNullOrWhiteSpace(user.Email)) return;

        // Resolve tenant: user's TenantId, or preferredTenantId, or the first configured tenant with custom SMTP/Brevo/Mailgun
        var targetTenantId = user.TenantId ?? preferredTenantId;
        TenantNotificationSettings? settings = null;
        Tenant? tenant = null;

        if (targetTenantId.HasValue)
        {
            settings = await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == targetTenantId.Value);
            tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == targetTenantId.Value);
        }

        // If user has no tenant or tenant has no custom email configured, look for any configured tenant's SMTP (e.g. Brevo/Mailgun)
        if (settings == null || !settings.UseCustomEmail)
        {
            var configuredSettings = await _db.TenantNotificationSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.UseCustomEmail && (!string.IsNullOrWhiteSpace(s.SmtpHost) || !string.IsNullOrWhiteSpace(s.ApiKey)));

            if (configuredSettings != null)
            {
                settings = configuredSettings;
                tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == settings.TenantId);
            }
        }

        var courseName = tenant?.Name ?? "OpenGolf";
        var subject = $"Reset Your {courseName} Password";
        var body = $"Hi {user.FirstName},\n\n" +
                   $"We received a request to reset the password for your OpenGolf account ({user.Email}).\n\n" +
                   $"Click the link below to choose a new password:\n{resetLink}\n\n" +
                   $"This password reset link will expire in 2 hours.\n" +
                   $"If you did not request this change, you can safely ignore this email — your account remains secure.\n\n" +
                   $"— {courseName} & OpenGolf Team";

        await DispatchEmailAsync(settings, tenant, user.Email, subject, body);
    }

    public async Task<TestNotificationResult> SendTestEmailAsync(Guid tenantId, string targetEmail, TenantNotificationSettings? customSettings = null)
    {
        try
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
            var settings = customSettings ?? await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

            var courseName = tenant?.Name ?? "Test Course";
            var subject = $"Test Email Notification from {courseName}";
            var body = $"Congratulations!\n\nThis is a live test email confirming that your email configuration for '{courseName}' is working properly.\n\nSent at: {DateTime.UtcNow:u}";

            await DispatchEmailAsync(settings, tenant, targetEmail, subject, body, isTest: true);
            return new TestNotificationResult(true, $"Test email successfully sent to {targetEmail}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send test email for tenant {TenantId}", tenantId);
            return new TestNotificationResult(false, $"Email delivery failed: {ex.Message}");
        }
    }

    public async Task<TestNotificationResult> SendTestSmsAsync(Guid tenantId, string targetPhone, TenantNotificationSettings? customSettings = null)
    {
        try
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
            var settings = customSettings ?? await _db.TenantNotificationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);

            var courseName = tenant?.Name ?? "Test Course";
            var smsBody = $"[Test] {courseName}: SMS notification service is connected and operational!";

            await DispatchSmsAsync(settings, targetPhone, smsBody);
            return new TestNotificationResult(true, $"Test SMS successfully sent to {targetPhone}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send test SMS for tenant {TenantId}", tenantId);
            return new TestNotificationResult(false, $"SMS delivery failed: {ex.Message}");
        }
    }

    // ── Internal Dispatchers ──────────────────────────────────────────────────

    private async Task DispatchEmailAsync(TenantNotificationSettings? settings, Tenant? tenant, string toEmail, string subject, string body, bool isTest = false)
    {
        if (settings != null && settings.UseCustomEmail)
        {
            try
            {
                if (string.Equals(settings.EmailProvider, "Mailgun", StringComparison.OrdinalIgnoreCase))
                {
                    await SendViaMailgunApiAsync(settings, tenant, toEmail, subject, body);
                    return;
                }

                if (!string.IsNullOrWhiteSpace(settings.SmtpHost))
                {
                    using var client = new SmtpClient(settings.SmtpHost, settings.SmtpPort)
                    {
                        EnableSsl = settings.SmtpEnableSsl,
                        UseDefaultCredentials = false,
                        DeliveryMethod = SmtpDeliveryMethod.Network
                    };

                    if (!string.IsNullOrWhiteSpace(settings.SmtpUsername) && !string.IsNullOrWhiteSpace(settings.SmtpPassword))
                    {
                        client.Credentials = new NetworkCredential(settings.SmtpUsername.Trim(), settings.SmtpPassword.Trim());
                    }

                    var fromAddress = !string.IsNullOrWhiteSpace(settings.FromEmail) ? settings.FromEmail : _defaultEmailOptions.FromEmail;
                    var fromDisplayName = !string.IsNullOrWhiteSpace(settings.FromName) ? settings.FromName : tenant?.Name ?? "OpenGolf";

                    using var mail = new MailMessage(new MailAddress(fromAddress, fromDisplayName), new MailAddress(toEmail))
                    {
                        Subject = subject,
                        Body = body
                    };

                    if (!string.IsNullOrWhiteSpace(settings.ReplyToEmail))
                    {
                        mail.ReplyToList.Add(new MailAddress(settings.ReplyToEmail));
                    }

                    await client.SendMailAsync(mail);
                    _logger.LogInformation("Custom SMTP email sent to {To} via {Host}:{Port}", toEmail, settings.SmtpHost, settings.SmtpPort);
                    return;
                }
            }
            catch (Exception ex)
            {
                if (isTest) throw; // Re-throw in test mode so user sees exact provider error in UI

                _logger.LogWarning(ex, "Course custom email provider failed for tenant {TenantId}. Automatically falling back to OpenGolf platform mailer.", settings.TenantId);
            }
        }

        // Platform default email sender with course display branding
        var courseName = tenant?.Name ?? _defaultEmailOptions.FromName;
        var message = new EmailMessage(toEmail, subject, body);
        await _defaultEmailSender.SendAsync(message);
    }

    private async Task SendViaMailgunApiAsync(TenantNotificationSettings settings, Tenant? tenant, string toEmail, string subject, string body)
    {
        var apiKey = !string.IsNullOrWhiteSpace(settings.ApiKey) ? settings.ApiKey : settings.SmtpPassword;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Mailgun API Key is required.");
        }

        // Domain: use SmtpHost if provided (e.g. sandboxcf1fbccd40e14599a863b5d3c0ef4d20.mailgun.org or custom domain)
        var domain = settings.SmtpHost;
        if (string.IsNullOrWhiteSpace(domain) && !string.IsNullOrWhiteSpace(settings.FromEmail) && settings.FromEmail.Contains('@'))
        {
            domain = settings.FromEmail.Split('@')[1];
        }
        if (string.IsNullOrWhiteSpace(domain))
        {
            domain = "sandboxcf1fbccd40e14599a863b5d3c0ef4d20.mailgun.org";
        }

        var client = _httpClientFactory.CreateClient();
        var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"api:{apiKey}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

        var fromAddress = !string.IsNullOrWhiteSpace(settings.FromEmail) ? settings.FromEmail : $"postmaster@{domain}";
        var fromDisplayName = !string.IsNullOrWhiteSpace(settings.FromName) ? settings.FromName : tenant?.Name ?? "OpenGolf";
        var fullFrom = $"{fromDisplayName} <{fromAddress}>";

        var formParams = new List<KeyValuePair<string, string>>
        {
            new("from", fullFrom),
            new("to", toEmail),
            new("subject", subject),
            new("text", body)
        };

        if (!string.IsNullOrWhiteSpace(settings.ReplyToEmail))
        {
            formParams.Add(new("h:Reply-To", settings.ReplyToEmail));
        }

        var form = new FormUrlEncodedContent(formParams);
        var url = $"https://api.mailgun.net/v3/{domain}/messages";
        var response = await client.PostAsync(url, form);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Mailgun API error ({Status}): {Error}", response.StatusCode, error);
            throw new InvalidOperationException($"Mailgun delivery failed ({response.StatusCode}): {error}");
        }

        _logger.LogInformation("Email sent to {To} via Mailgun API ({Domain})", toEmail, domain);
    }

    private async Task DispatchSmsAsync(TenantNotificationSettings? settings, string toPhone, string body)
    {
        if (settings != null && settings.UseCustomSms && !string.IsNullOrWhiteSpace(settings.TwilioAccountSid) && !string.IsNullOrWhiteSpace(settings.TwilioAuthToken))
        {
            // Send via Twilio REST API
            var client = _httpClientFactory.CreateClient();
            var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{settings.TwilioAccountSid}:{settings.TwilioAuthToken}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var form = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("To", toPhone),
                new KeyValuePair<string, string>("From", settings.TwilioFromNumber ?? ""),
                new KeyValuePair<string, string>("Body", body)
            });

            var url = $"https://api.twilio.com/2010-04-01/Accounts/{settings.TwilioAccountSid}/Messages.json";
            var response = await client.PostAsync(url, form);

            if (!response.IsOk())
            {
                var errorText = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Twilio SMS failed ({Status}): {Error}", response.StatusCode, errorText);
                throw new InvalidOperationException($"Twilio SMS failed with status {response.StatusCode}");
            }

            _logger.LogInformation("SMS dispatched via Twilio to {Phone}", toPhone);
        }
        else
        {
            // Dev/Platform fallback: log to console
            _logger.LogInformation("=== SMS NOTIFICATION (Console Provider) ===\nTo: {To}\nMessage: {Body}\n===========================================", toPhone, body);
        }
    }
}

internal static class HttpResponseExtensions
{
    public static bool IsOk(this HttpResponseMessage res) => res.IsSuccessStatusCode;
}
