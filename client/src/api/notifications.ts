import { apiFetch } from "./client";

export interface NotificationSettings {
  id: string;
  tenantId: string;
  useCustomEmail: boolean;
  emailProvider: string;
  fromEmail: string | null;
  fromName: string | null;
  replyToEmail: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpEnableSsl: boolean;
  smtpUsername: string | null;
  hasSmtpPassword: boolean;
  hasApiKey: boolean;
  useCustomSms: boolean;
  smsProvider: string;
  twilioAccountSid: string | null;
  hasTwilioAuthToken: boolean;
  twilioFromNumber: string | null;
  useCustomWhatsApp: boolean;
  whatsAppProvider: string;
  whatsAppFromNumber: string | null;
  sendBookingConfirmationEmail: boolean;
  sendBookingConfirmationSms: boolean;
  sendBookingConfirmationWhatsApp: boolean;
  sendPaymentReceiptEmail: boolean;
  sendPaymentReceiptWhatsApp: boolean;
  sendReminder24HoursBefore: boolean;
  sendReminderWhatsApp: boolean;
  sendCancellationNotice: boolean;
  customEmailFooter: string | null;
  customDressCodePolicy: string | null;
  customDirectionsNotes: string | null;
  updatedAt: string;
}

export interface UpdateNotificationSettingsPayload {
  useCustomEmail: boolean;
  emailProvider: string;
  fromEmail?: string | null;
  fromName?: string | null;
  replyToEmail?: string | null;
  smtpHost?: string | null;
  smtpPort: number;
  smtpEnableSsl: boolean;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  apiKey?: string | null;
  useCustomSms: boolean;
  smsProvider: string;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioFromNumber?: string | null;
  useCustomWhatsApp: boolean;
  whatsAppProvider: string;
  whatsAppFromNumber?: string | null;
  sendBookingConfirmationEmail: boolean;
  sendBookingConfirmationSms: boolean;
  sendBookingConfirmationWhatsApp: boolean;
  sendPaymentReceiptEmail: boolean;
  sendPaymentReceiptWhatsApp: boolean;
  sendReminder24HoursBefore: boolean;
  sendReminderWhatsApp: boolean;
  sendCancellationNotice: boolean;
  customEmailFooter?: string | null;
  customDressCodePolicy?: string | null;
  customDirectionsNotes?: string | null;
}

export const notificationsApi = {
  getSettings: (tenantId: string, token?: string | null) =>
    apiFetch<NotificationSettings>(
      `/api/tenants/${tenantId}/notifications/settings`,
      { method: "GET" },
      token,
      tenantId
    ),

  updateSettings: (tenantId: string, data: UpdateNotificationSettingsPayload, token?: string | null) =>
    apiFetch<NotificationSettings>(
      `/api/tenants/${tenantId}/notifications/settings`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  testEmail: (tenantId: string, targetEmail: string, token?: string | null) =>
    apiFetch<{ success: boolean; message: string }>(
      `/api/tenants/${tenantId}/notifications/test-email`,
      {
        method: "POST",
        body: JSON.stringify({ targetEmail }),
      },
      token,
      tenantId
    ),

  testSms: (tenantId: string, targetPhone: string, token?: string | null) =>
    apiFetch<{ success: boolean; message: string }>(
      `/api/tenants/${tenantId}/notifications/test-sms`,
      {
        method: "POST",
        body: JSON.stringify({ targetPhone }),
      },
      token,
      tenantId
    ),

  testWhatsApp: (tenantId: string, targetPhone: string, token?: string | null) =>
    apiFetch<{ success: boolean; message: string }>(
      `/api/tenants/${tenantId}/notifications/test-whatsapp`,
      {
        method: "POST",
        body: JSON.stringify({ targetPhone }),
      },
      token,
      tenantId
    ),
};
