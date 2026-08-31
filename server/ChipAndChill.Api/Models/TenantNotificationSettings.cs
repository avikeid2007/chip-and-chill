using System.ComponentModel.DataAnnotations;

namespace ChipAndChill.Api.Models;

public class TenantNotificationSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    // ── Email Settings ──────────────────────────────────────────
    public bool UseCustomEmail { get; set; } = false;
    public string EmailProvider { get; set; } = "Smtp"; // "Smtp" | "SendGrid" | "Mailgun"
    public string? FromEmail { get; set; }
    public string? FromName { get; set; }
    public string? ReplyToEmail { get; set; }
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool SmtpEnableSsl { get; set; } = true;
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
    public string? ApiKey { get; set; }

    // ── SMS & WhatsApp Settings ─────────────────────────────────
    public bool UseCustomSms { get; set; } = false;
    public string SmsProvider { get; set; } = "Twilio"; // "Twilio" | "AwsSns"
    public string? TwilioAccountSid { get; set; }
    public string? TwilioAuthToken { get; set; }
    public string? TwilioFromNumber { get; set; }

    public bool UseCustomWhatsApp { get; set; } = false;
    public string WhatsAppProvider { get; set; } = "TwilioWhatsApp"; // "TwilioWhatsApp" | "MetaCloudApi"
    public string? WhatsAppFromNumber { get; set; }

    // ── Notification Toggles ────────────────────────────────────
    public bool SendBookingConfirmationEmail { get; set; } = true;
    public bool SendBookingConfirmationSms { get; set; } = false;
    public bool SendBookingConfirmationWhatsApp { get; set; } = false;

    public bool SendPaymentReceiptEmail { get; set; } = true;
    public bool SendPaymentReceiptWhatsApp { get; set; } = false;

    public bool SendReminder24HoursBefore { get; set; } = true;
    public bool SendReminderWhatsApp { get; set; } = false;
    public bool SendCancellationNotice { get; set; } = true;

    // ── Custom Message Notes & Policies ─────────────────────────
    public string? CustomEmailFooter { get; set; }
    public string? CustomDressCodePolicy { get; set; }
    public string? CustomDirectionsNotes { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
