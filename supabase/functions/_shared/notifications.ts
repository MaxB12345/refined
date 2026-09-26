export type BookingNotificationInput = {
  customerName: string;
  customerEmail: string;
  confirmationToken: string;
  startsAt: string;
  treatmentName: string;
  durationMinutes: number;
  pricePence: number;
};

export type NotificationResult = {
  emailSentAt: string | null;
  emailError: string | null;
};

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function siteUrl() {
  return (Deno.env.get("PUBLIC_SITE_URL") ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://sculptedbyruby.uk").replace(/\/$/, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatPrice(pricePence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(pricePence / 100);
}

async function request(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendEmail(input: BookingNotificationInput) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) return { sentAt: null, error: "Resend is not configured" };

  const date = escapeHtml(formatDate(input.startsAt));
  const time = escapeHtml(formatTime(input.startsAt));
  const name = escapeHtml(input.customerName);
  const treatment = escapeHtml(input.treatmentName);
  const confirmationUrl = `${siteUrl()}/booking/confirmation/${encodeURIComponent(input.confirmationToken)}`;
  const html = `<html><body style="margin:0;background:#fcfaf8;color:#564036;font-family:Arial,sans-serif"><div style="max-width:560px;margin:40px auto;padding:32px"><p style="font-size:24px;margin:0 0 28px">Sculpted by Ruby</p><p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#947860">Appointment confirmed</p><h1 style="font-weight:500;font-size:36px;line-height:1.1">A little time, just for you.</h1><p>Hi ${name}, your appointment is confirmed.</p><div style="margin:28px 0;padding:20px;border:1px solid #ded1c6;border-radius:16px"><strong>${treatment}</strong><br>${date}<br>${time} · ${input.durationMinutes} minutes<br>${formatPrice(input.pricePence)}</div><p><a href="${confirmationUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#564036;color:#fff;text-decoration:none">View appointment</a></p><p style="color:#947860;font-size:13px">Please keep this email for your appointment details.</p></div></body></html>`;

  try {
    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [input.customerEmail],
        subject: `Appointment confirmed | ${input.treatmentName}`,
        html,
      }),
    });
    if (!response.ok) return { sentAt: null, error: `Resend returned HTTP ${response.status}` };
    return { sentAt: new Date().toISOString(), error: null };
  } catch {
    return { sentAt: null, error: "Resend request failed" };
  }
}

export async function sendBookingNotifications(input: BookingNotificationInput): Promise<NotificationResult> {
  const email = await sendEmail(input);
  return { emailSentAt: email.sentAt, emailError: email.error };
}

export function notificationColumns(result: NotificationResult) {
  return {
    confirmation_email_sent_at: result.emailSentAt,
    confirmation_email_error: result.emailError,
  };
}
