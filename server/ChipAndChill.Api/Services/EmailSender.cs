using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace ChipAndChill.Api.Services;

public class EmailOptions
{
    public string Provider { get; set; } = "Console"; // "Console" | "Smtp" | "SendGrid"
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string FromEmail { get; set; } = "noreply@chipandchill.com";
    public string FromName { get; set; } = "Chip & Chill";
}

public record EmailMessage(string To, string Subject, string Body);

// Pluggable email sender. Console provider logs to stdout (dev default);
// SMTP works with any relay (Gmail, SES, Mailgun...). SendGrid stub ready
// for an API-key integration later.
public interface IEmailSender
{
    Task SendAsync(EmailMessage message);
}

public class EmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IOptions<EmailOptions> options, ILogger<EmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message)
    {
        switch (_options.Provider)
        {
            case "Smtp":
                await SendViaSmtpAsync(message);
                break;
            case "SendGrid":
                // Phase 3: swap for SendGrid API client once payments/API keys land.
                _logger.LogWarning("SendGrid provider not yet implemented; falling back to console log.");
                LogToConsole(message);
                break;
            default:
                LogToConsole(message);
                break;
        }
    }

    private async Task SendViaSmtpAsync(EmailMessage message)
    {
        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            Credentials = new NetworkCredential(_options.Username, _options.Password),
            EnableSsl = true
        };
        var mail = new MailMessage(_options.FromEmail, message.To, message.Subject, message.Body);
        await client.SendMailAsync(mail);
        _logger.LogInformation("Email sent to {To} via SMTP", message.To);
    }

    private void LogToConsole(EmailMessage message)
    {
        _logger.LogInformation(
            "=== EMAIL (console provider) ===\nTo: {To}\nFrom: {From}\nSubject: {Subject}\n{Body}\n========================",
            message.To, _options.FromEmail, message.Subject, message.Body);
    }
}

