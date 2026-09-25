import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicEnvironment } from "@/lib/env";

export type AdminAppointment = {
  id: string;
  public_token: string;
  customer_id: string;
  treatment_id: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  treatment_name: string;
  price_pence: number;
  duration_minutes: number;
  customer_note: string | null;
  admin_note: string | null;
  cancellation_reason?: string | null;
  confirmation_email_error?: string | null;
};

export type AdminTreatment = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_pence: number;
  duration_minutes: number;
  active: boolean;
  display_order: number;
};

export type AdminWorkingHour = {
  id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  is_enabled: boolean;
};

export type AdminBlockedTime = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type AdminCustomer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  deleted_at: string | null;
  created_at?: string;
};

export type AdminProfile = {
  id: boolean;
  business_name: string;
  beautician_name: string;
  tagline: string | null;
  about_heading: string | null;
  about_body: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  instagram_url: string | null;
  whatsapp_number: string | null;
};

export type AdminSettings = {
  id: boolean;
  timezone: string;
  slot_interval_minutes: number;
  cancellation_notice_hours: number;
  minimum_booking_notice_minutes: number;
};

export type AdminGalleryItem = {
  id: string;
  slug: string;
  storage_path: string | null;
  image_url: string | null;
  alt_text: string;
  caption: string | null;
  display_order: number;
  published: boolean;
};

export type AdminResource =
  | "appointments"
  | "treatments"
  | "working_hours"
  | "blocked_times"
  | "customers"
  | "business_profile"
  | "business_settings"
  | "gallery_items";

async function adminApi<T>(path: string, init?: RequestInit) {
  const supabase = createSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Please sign in as an admin to continue");

  const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? "The admin operation failed");
  return payload as T;
}

export async function listAdminRecords<T>(resource: AdminResource) {
  const response = await adminApi<{ records: T[] }>(`?resource=${resource}`);
  return response.records;
}

export async function createAdminRecord<T>(resource: AdminResource, payload: Record<string, unknown>) {
  const response = await adminApi<{ record: T }>(`?resource=${resource}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.record;
}

export async function updateAdminRecord<T>(resource: AdminResource, id: string | null, payload: Record<string, unknown>) {
  const query = id ? `?resource=${resource}&id=${encodeURIComponent(id)}` : `?resource=${resource}`;
  const response = await adminApi<{ record: T }>(query, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.record;
}

export async function deleteAdminRecord(resource: AdminResource, id: string) {
  await adminApi(`?resource=${resource}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createAdminAppointment(payload: Record<string, unknown>) {
  const response = await adminApi<{ appointment: AdminAppointment }>("?resource=appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.appointment;
}

export async function cancelAdminAppointment(id: string, reason?: string) {
  const response = await adminApi<{ appointment: AdminAppointment }>(`?resource=appointments&id=${id}&operation=cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return response.appointment;
}

export async function rescheduleAdminAppointment(id: string, date: string, startTime: string) {
  const response = await adminApi<{ appointment: AdminAppointment }>(`?resource=appointments&id=${id}&operation=reschedule`, {
    method: "POST",
    body: JSON.stringify({ date, start_time: startTime }),
  });
  return response.appointment;
}

export async function getAdminDashboardData() {
  const [appointments, treatments, workingHours, blockedTimes, customers, profile, settings, gallery] = await Promise.all([
    listAdminRecords<AdminAppointment>("appointments"),
    listAdminRecords<AdminTreatment>("treatments"),
    listAdminRecords<AdminWorkingHour>("working_hours"),
    listAdminRecords<AdminBlockedTime>("blocked_times"),
    listAdminRecords<AdminCustomer>("customers"),
    listAdminRecords<AdminProfile>("business_profile"),
    listAdminRecords<AdminSettings>("business_settings"),
    listAdminRecords<AdminGalleryItem>("gallery_items"),
  ]);

  return {
    appointments,
    treatments,
    workingHours,
    blockedTimes,
    customers,
    profile: profile[0] ?? null,
    settings: settings[0] ?? null,
    gallery,
  };
}
