using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChipAndChill.Api.Data;
using ChipAndChill.Api.Models;
using ChipAndChill.Api.Security;
using ChipAndChill.Api.Services;

namespace ChipAndChill.Api.Controllers;

public record NotificationSettingsResponse(
    Guid Id,
    Guid TenantId,
    bool UseCustomEmail,
    string EmailProvider,
    string? FromEmail,
    string? FromName,
    string? ReplyToEmail,
    string? SmtpHost,
    int SmtpPort,
    bool SmtpEnableSsl,
    string? SmtpUsername,
    bool HasSmtpPassword,
    bool HasApiKey,
    bool UseCustomSms,
    string SmsProvider,
    string? TwilioAccountSid,
    bool HasTwilioAuthToken,
    string? TwilioFromNumber,
    bool UseCustomWhatsApp,
    string WhatsAppProvider,
    string? WhatsAppFromNumber,
    bool SendBookingConfirmationEmail,
    bool SendBookingConfirmationSms,
    bool SendBookingConfirmationWhatsApp,
    bool SendPaymentReceiptEmail,
    bool SendPaymentReceiptWhatsApp,
    bool SendReminder24HoursBefore,
    bool SendReminderWhatsApp,
    bool SendCancellationNotice,
    string? CustomEmailFooter,
    string? CustomDressCodePolicy,
    string? CustomDirectionsNotes,
    DateTime UpdatedAt
);

public record UpdateNotificationSettingsRequest(
    bool UseCustomEmail,
    string EmailProvider,
    string? FromEmail,
    string? FromName,
    string? ReplyToEmail,
    string? SmtpHost,
    int SmtpPort,
    bool SmtpEnableSsl,
    string? SmtpUsername,
    string? SmtpPassword,
    string? ApiKey,
    bool UseCustomSms,
    string SmsProvider,
    string? TwilioAccountSid,
    string? TwilioAuthToken,
    string? TwilioFromNumber,
    bool UseCustomWhatsApp,
    string WhatsAppProvider,
    string? WhatsAppFromNumber,
    bool SendBookingConfirmationEmail,
    bool SendBookingConfirmationSms,
    bool SendBookingConfirmationWhatsApp,
    bool SendPaymentReceiptEmail,
    bool SendPaymentReceiptWhatsApp,
    bool SendReminder24HoursBefore,
    bool SendReminderWhatsApp,
    bool SendCancellationNotice,
    string? CustomEmailFooter,
    string? CustomDressCodePolicy,
    string? CustomDirectionsNotes
);

public record TestEmailRequest(string TargetEmail);
public record TestSmsRequest(string TargetPhone);
public record TestWhatsAppRequest(string TargetPhone);

[ApiController]
[Route("api/tenants/{tenantId:guid}/notifications")]
[Authorize(Roles = "CourseAdmin,Staff,SuperAdmin")]
public class NotificationSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantNotificationService _notificationService;

    public NotificationSettingsController(AppDbContext db, ITenantNotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    [HttpGet("settings")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<NotificationSettingsResponse>> GetSettings(Guid tenantId)
    {
        var settings = await _db.TenantNotificationSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (settings == null)
        {
            try
            {
                settings = new TenantNotificationSettings
                {
                    TenantId = tenantId
                };
                _db.TenantNotificationSettings.Add(settings);
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // In case of race condition, reload existing settings
                settings = await _db.TenantNotificationSettings
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId) ?? new TenantNotificationSettings { TenantId = tenantId };
            }
        }

        return Ok(ToResponse(settings));
    }

    [HttpPut("settings")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<NotificationSettingsResponse>> UpdateSettings(Guid tenantId, UpdateNotificationSettingsRequest req)
    {
        var settings = await _db.TenantNotificationSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (settings == null)
        {
            settings = new TenantNotificationSettings { TenantId = tenantId };
            _db.TenantNotificationSettings.Add(settings);
        }

        settings.UseCustomEmail = req.UseCustomEmail;
        settings.EmailProvider = req.EmailProvider;
        settings.FromEmail = req.FromEmail;
        settings.FromName = req.FromName;
        settings.ReplyToEmail = req.ReplyToEmail;
        settings.SmtpHost = req.SmtpHost;
        settings.SmtpPort = req.SmtpPort;
        settings.SmtpEnableSsl = req.SmtpEnableSsl;
        settings.SmtpUsername = req.SmtpUsername;

        if (!string.IsNullOrWhiteSpace(req.SmtpPassword))
        {
            settings.SmtpPassword = req.SmtpPassword;
        }

        if (!string.IsNullOrWhiteSpace(req.ApiKey))
        {
            settings.ApiKey = req.ApiKey;
        }

        settings.UseCustomSms = req.UseCustomSms;
        settings.SmsProvider = req.SmsProvider;
        settings.TwilioAccountSid = req.TwilioAccountSid;

        if (!string.IsNullOrWhiteSpace(req.TwilioAuthToken))
        {
            settings.TwilioAuthToken = req.TwilioAuthToken;
        }

        settings.TwilioFromNumber = req.TwilioFromNumber;
        settings.UseCustomWhatsApp = req.UseCustomWhatsApp;
        settings.WhatsAppProvider = req.WhatsAppProvider;
        settings.WhatsAppFromNumber = req.WhatsAppFromNumber;

        settings.SendBookingConfirmationEmail = req.SendBookingConfirmationEmail;
        settings.SendBookingConfirmationSms = req.SendBookingConfirmationSms;
        settings.SendBookingConfirmationWhatsApp = req.SendBookingConfirmationWhatsApp;
        settings.SendPaymentReceiptEmail = req.SendPaymentReceiptEmail;
        settings.SendPaymentReceiptWhatsApp = req.SendPaymentReceiptWhatsApp;
        settings.SendReminder24HoursBefore = req.SendReminder24HoursBefore;
        settings.SendReminderWhatsApp = req.SendReminderWhatsApp;
        settings.SendCancellationNotice = req.SendCancellationNotice;

        settings.CustomEmailFooter = req.CustomEmailFooter;
        settings.CustomDressCodePolicy = req.CustomDressCodePolicy;
        settings.CustomDirectionsNotes = req.CustomDirectionsNotes;
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(ToResponse(settings));
    }

    [HttpPost("test-email")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<object>> TestEmail(Guid tenantId, TestEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.TargetEmail))
            return BadRequest("Target email is required.");

        var result = await _notificationService.SendTestEmailAsync(tenantId, req.TargetEmail);
        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, message = result.Message });
    }

    [HttpPost("test-sms")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<object>> TestSms(Guid tenantId, TestSmsRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.TargetPhone))
            return BadRequest("Target phone number is required.");

        var result = await _notificationService.SendTestSmsAsync(tenantId, req.TargetPhone);
        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, message = result.Message });
    }

    [HttpPost("test-whatsapp")]
    [TenantScoped("tenantId")]
    public async Task<ActionResult<object>> TestWhatsApp(Guid tenantId, TestWhatsAppRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.TargetPhone))
            return BadRequest("Target phone number is required.");

        var result = await _notificationService.SendTestWhatsAppAsync(tenantId, req.TargetPhone);
        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, message = result.Message });
    }

    private static NotificationSettingsResponse ToResponse(TenantNotificationSettings s)
    {
        return new NotificationSettingsResponse(
            s.Id,
            s.TenantId,
            s.UseCustomEmail,
            s.EmailProvider,
            s.FromEmail,
            s.FromName,
            s.ReplyToEmail,
            s.SmtpHost,
            s.SmtpPort,
            s.SmtpEnableSsl,
            s.SmtpUsername,
            !string.IsNullOrWhiteSpace(s.SmtpPassword),
            !string.IsNullOrWhiteSpace(s.ApiKey),
            s.UseCustomSms,
            s.SmsProvider,
            s.TwilioAccountSid,
            !string.IsNullOrWhiteSpace(s.TwilioAuthToken),
            s.TwilioFromNumber,
            s.UseCustomWhatsApp,
            s.WhatsAppProvider,
            s.WhatsAppFromNumber,
            s.SendBookingConfirmationEmail,
            s.SendBookingConfirmationSms,
            s.SendBookingConfirmationWhatsApp,
            s.SendPaymentReceiptEmail,
            s.SendPaymentReceiptWhatsApp,
            s.SendReminder24HoursBefore,
            s.SendReminderWhatsApp,
            s.SendCancellationNotice,
            s.CustomEmailFooter,
            s.CustomDressCodePolicy,
            s.CustomDirectionsNotes,
            s.UpdatedAt
        );
    }
}
