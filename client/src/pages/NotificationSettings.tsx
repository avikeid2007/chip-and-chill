import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import {
  notificationsApi,
  type NotificationSettings,
  type UpdateNotificationSettingsPayload,
} from "../api/notifications";

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [emailProvider, setEmailProvider] = useState("Smtp");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEnableSsl, setSmtpEnableSsl] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [hasSmtpPassword, setHasSmtpPassword] = useState(false);

  // SMS State
  const [useCustomSms, setUseCustomSms] = useState(false);
  const [smsProvider, setSmsProvider] = useState("Twilio");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [hasTwilioAuthToken, setHasTwilioAuthToken] = useState(false);
  const [twilioFromNumber, setTwilioFromNumber] = useState("");

  // Automation Toggles
  const [sendBookingConfirmationEmail, setSendBookingConfirmationEmail] = useState(true);
  const [sendBookingConfirmationSms, setSendBookingConfirmationSms] = useState(false);
  const [sendReminder24HoursBefore, setSendReminder24HoursBefore] = useState(true);
  const [sendCancellationNotice, setSendCancellationNotice] = useState(true);

  // Policies & Templates
  const [customEmailFooter, setCustomEmailFooter] = useState("");
  const [customDressCodePolicy, setCustomDressCodePolicy] = useState("");
  const [customDirectionsNotes, setCustomDirectionsNotes] = useState("");

  // Test Tool States
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || "");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsStatus, setTestSmsStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    setLoading(true);
    notificationsApi
      .getSettings(tenantId, user?.token)
      .then((data: NotificationSettings) => {
        setUseCustomEmail(data.useCustomEmail);
        setEmailProvider(data.emailProvider || "Smtp");
        setFromEmail(data.fromEmail || "");
        setFromName(data.fromName || "");
        setReplyToEmail(data.replyToEmail || "");
        setSmtpHost(data.smtpHost || "");
        setSmtpPort(data.smtpPort || 587);
        setSmtpEnableSsl(data.smtpEnableSsl);
        setSmtpUsername(data.smtpUsername || "");
        setHasSmtpPassword(data.hasSmtpPassword);

        setUseCustomSms(data.useCustomSms);
        setSmsProvider(data.smsProvider || "Twilio");
        setTwilioAccountSid(data.twilioAccountSid || "");
        setHasTwilioAuthToken(data.hasTwilioAuthToken);
        setTwilioFromNumber(data.twilioFromNumber || "");

        setSendBookingConfirmationEmail(data.sendBookingConfirmationEmail);
        setSendBookingConfirmationSms(data.sendBookingConfirmationSms);
        setSendReminder24HoursBefore(data.sendReminder24HoursBefore);
        setSendCancellationNotice(data.sendCancellationNotice);

        setCustomEmailFooter(data.customEmailFooter || "");
        setCustomDressCodePolicy(data.customDressCodePolicy || "");
        setCustomDirectionsNotes(data.customDirectionsNotes || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load notification settings."))
      .finally(() => setLoading(false));
  }, [tenantId, user?.token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload: UpdateNotificationSettingsPayload = {
      useCustomEmail,
      emailProvider,
      fromEmail: fromEmail || null,
      fromName: fromName || null,
      replyToEmail: replyToEmail || null,
      smtpHost: smtpHost || null,
      smtpPort,
      smtpEnableSsl,
      smtpUsername: smtpUsername || null,
      smtpPassword: smtpPassword || null,
      useCustomSms,
      smsProvider,
      twilioAccountSid: twilioAccountSid || null,
      twilioAuthToken: twilioAuthToken || null,
      twilioFromNumber: twilioFromNumber || null,
      sendBookingConfirmationEmail,
      sendBookingConfirmationSms,
      sendReminder24HoursBefore,
      sendCancellationNotice,
      customEmailFooter: customEmailFooter || null,
      customDressCodePolicy: customDressCodePolicy || null,
      customDirectionsNotes: customDirectionsNotes || null,
    };

    try {
      const updated = await notificationsApi.updateSettings(tenantId, payload, user?.token);
      setHasSmtpPassword(updated.hasSmtpPassword);
      setHasTwilioAuthToken(updated.hasTwilioAuthToken);
      setSmtpPassword("");
      setTwilioAuthToken("");
      setSuccessMsg("Notification settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!tenantId || !testEmailAddress) return;
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const res = await notificationsApi.testEmail(tenantId, testEmailAddress, user?.token);
      setTestEmailStatus({ ok: true, msg: res.message });
    } catch (err) {
      setTestEmailStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Test email failed.",
      });
    } finally {
      setTestEmailLoading(false);
    }
  }

  async function handleTestSms() {
    if (!tenantId || !testPhoneNumber) return;
    setTestSmsLoading(true);
    setTestSmsStatus(null);
    try {
      const res = await notificationsApi.testSms(tenantId, testPhoneNumber, user?.token);
      setTestSmsStatus({ ok: true, msg: res.message });
    } catch (err) {
      setTestSmsStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Test SMS failed.",
      });
    } finally {
      setTestSmsLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-gray-500 font-mono text-sm">
          Loading notification settings...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight">
              Email &amp; SMS Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure course-specific sender emails, custom SMTP, Twilio SMS alerts, and player confirmation policies.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-fairway text-white font-semibold text-sm hover:bg-fairway/90 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Banners */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Card 1: Email Configuration */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>✉️</span> Course Email Dispatch
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose between OpenGolf's default email service or connect your course's own SMTP relay.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomEmail}
                  onChange={(e) => setUseCustomEmail(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fairway"></div>
                <span className="ml-3 text-xs font-semibold text-gray-700">
                  {useCustomEmail ? "Custom SMTP Active" : "Platform Mailer"}
                </span>
              </label>
            </div>

            {useCustomEmail ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Service Provider
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="emailProvider"
                        value="Smtp"
                        checked={emailProvider === "Smtp"}
                        onChange={() => setEmailProvider("Smtp")}
                        className="text-fairway focus:ring-fairway"
                      />
                      Universal SMTP Relay (SendGrid / AWS SES / Gmail / Zoho / Custom)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="emailProvider"
                        value="Mailgun"
                        checked={emailProvider === "Mailgun"}
                        onChange={() => setEmailProvider("Mailgun")}
                        className="text-fairway focus:ring-fairway"
                      />
                      Mailgun REST API
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    From Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pine Hollow Pro Shop or Mailgun Sandbox"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    placeholder={emailProvider === "Mailgun" ? "e.g. postmaster@sandbox...mailgun.org" : "e.g. proshop@pinehollowgolf.com"}
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reply-To Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. support@pinehollowgolf.com"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>

                {emailProvider === "Mailgun" ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mailgun Domain / Sandbox Domain
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. sandboxcf1fbccd40e14599a863b5d3c0ef4d20.mailgun.org"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mailgun API Key
                      </label>
                      <input
                        type="password"
                        placeholder={hasSmtpPassword ? "•••••••••••• (Saved. Enter new key to update)" : "Enter your Mailgun private API key"}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway font-mono text-xs"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Find your Private API key in Mailgun Dashboard &gt; Sending &gt; API keys.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        SMTP Host / Server
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. smtp.sendgrid.net or smtp.gmail.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        placeholder="apikey or username"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        SMTP Password / API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder={hasSmtpPassword ? "•••••••••••• (Saved. Enter new to change)" : "Enter SMTP password or API token"}
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="sslToggle"
                        checked={smtpEnableSsl}
                        onChange={(e) => setSmtpEnableSsl(e.target.checked)}
                        className="rounded text-fairway focus:ring-fairway"
                      />
                      <label htmlFor="sslToggle" className="text-xs text-gray-700 font-medium">
                        Enable SSL / TLS encryption (recommended for port 587 / 465)
                      </label>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Using Platform Managed Email Service</p>
                  <p className="mt-0.5 text-gray-500">
                    All player emails will be sent through OpenGolf’s high-deliverability email infrastructure with your course branding.
                  </p>
                </div>
              </div>
            )}

            {/* Test Email Section */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Live Test Email Connection
              </label>
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testEmailLoading || !testEmailAddress}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {testEmailLoading ? "Sending..." : "Send Test Email"}
                </button>
              </div>
              {testEmailStatus && (
                <p className={`mt-2 text-xs font-medium ${testEmailStatus.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {testEmailStatus.ok ? "✓ " : "⚠️ "} {testEmailStatus.msg}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: SMS Alerts */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>📱</span> SMS &amp; Text Alerts (Twilio)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Send instant booking confirmations and tee time reminders directly to golfers’ mobile phones.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomSms}
                  onChange={(e) => setUseCustomSms(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fairway"></div>
                <span className="ml-3 text-xs font-semibold text-gray-700">
                  {useCustomSms ? "Twilio SMS Active" : "Disabled"}
                </span>
              </label>
            </div>

            {useCustomSms && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Twilio Account SID
                  </label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Twilio Auth Token
                  </label>
                  <input
                    type="password"
                    placeholder={hasTwilioAuthToken ? "•••••••••••• (Saved)" : "Enter Twilio Auth Token"}
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Twilio Phone Number or Sender ID
                  </label>
                  <input
                    type="text"
                    placeholder="+1234567890 or PINEGOLF"
                    value={twilioFromNumber}
                    onChange={(e) => setTwilioFromNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                  />
                </div>
              </div>
            )}

            {/* Test SMS Section */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Live Test SMS Dispatch
              </label>
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <input
                  type="tel"
                  placeholder="+19876543210"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={testSmsLoading || !testPhoneNumber}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {testSmsLoading ? "Sending..." : "Send Test SMS"}
                </button>
              </div>
              {testSmsStatus && (
                <p className={`mt-2 text-xs font-medium ${testSmsStatus.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {testSmsStatus.ok ? "✓ " : "⚠️ "} {testSmsStatus.msg}
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Notification Automation Rules */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>⚡</span> Player Notification Triggers
            </h2>
            <p className="text-xs text-gray-500">
              Choose which events automatically dispatch emails or SMS to golfers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sendBookingConfirmationEmail}
                  onChange={(e) => setSendBookingConfirmationEmail(e.target.checked)}
                  className="rounded text-fairway focus:ring-fairway h-4 w-4"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Booking Confirmation Email</div>
                  <div className="text-xs text-gray-500">Send receipt &amp; tee time summary on booking</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sendBookingConfirmationSms}
                  onChange={(e) => setSendBookingConfirmationSms(e.target.checked)}
                  className="rounded text-fairway focus:ring-fairway h-4 w-4"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Booking Confirmation SMS</div>
                  <div className="text-xs text-gray-500">Send quick text confirmation to phone</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sendReminder24HoursBefore}
                  onChange={(e) => setSendReminder24HoursBefore(e.target.checked)}
                  className="rounded text-fairway focus:ring-fairway h-4 w-4"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">24-Hour Tee Time Reminder</div>
                  <div className="text-xs text-gray-500">Remind player 24 hours prior to tee off</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={sendCancellationNotice}
                  onChange={(e) => setSendCancellationNotice(e.target.checked)}
                  className="rounded text-fairway focus:ring-fairway h-4 w-4"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Cancellation &amp; Refund Notice</div>
                  <div className="text-xs text-gray-500">Notify player if tee time is cancelled</div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 4: Custom Notes & Policies */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>📝</span> Course Policies &amp; Email Footers
            </h2>
            <p className="text-xs text-gray-500">
              These custom notes are automatically merged into all player emails for your course.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dress Code &amp; Club Rules
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Soft spikes required. Collared shirts must be tucked in. No denim allowed on the championship course."
                  value={customDressCodePolicy}
                  onChange={(e) => setCustomDressCodePolicy(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gate Entrance &amp; Parking Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please enter via Gate 2 on Clubhouse Way. Bag drop is located next to the main pro shop."
                  value={customDirectionsNotes}
                  onChange={(e) => setCustomDirectionsNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Email Footer / Signature
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. For golf cart rentals or caddie bookings, please call the pro shop at (555) 019-2834."
                  value={customEmailFooter}
                  onChange={(e) => setCustomEmailFooter(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-gold text-fairway font-bold text-sm hover:-translate-y-px transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save All Settings"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
