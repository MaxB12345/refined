import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicEnvironment } from "@/lib/env";

export type CustomerAppointment = {
  id: string;
  public_token: string;
  treatment_id: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  treatment_name: string;
  price_pence: number;
  duration_minutes: number;
  customer_note: string | null;
};

export type CustomerProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
};

export class CustomerApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "CustomerApiError";
    this.status = status;
    this.code = code;
  }
}

async function customerApi<T>(path: string, init?: RequestInit) {
  const supabase = createSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new CustomerApiError("Please sign in to continue", 401, "auth_required");

  const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/customer-api/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;

  if (!response.ok) {
    throw new CustomerApiError(
      payload?.message ?? "Your account could not be loaded",
      response.status,
      payload?.error ?? "request_failed",
    );
  }

  return payload as T;
}

export async function getCustomerAppointments() {
  const response = await customerApi<{ appointments: CustomerAppointment[] }>("appointments");
  return response.appointments;
}

export async function getCustomerProfile() {
  const response = await customerApi<{ profile: CustomerProfile | null }>("profile");
  return response.profile;
}

export async function updateCustomerProfile(fullName: string, phone: string) {
  const response = await customerApi<{ profile: CustomerProfile }>("profile", {
    method: "PATCH",
    body: JSON.stringify({ full_name: fullName, phone }),
  });
  return response.profile;
}

export async function cancelCustomerAppointment(appointmentId: string) {
  const response = await customerApi<{ appointment: CustomerAppointment }>("cancel", {
    method: "POST",
    body: JSON.stringify({ appointment_id: appointmentId }),
  });
  return response.appointment;
}

export async function rescheduleCustomerAppointment(appointmentId: string, date: string, startTime: string) {
  const response = await customerApi<{ appointment: CustomerAppointment }>("reschedule", {
    method: "POST",
    body: JSON.stringify({ appointment_id: appointmentId, date, start_time: startTime }),
  });
  return response.appointment;
}
