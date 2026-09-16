import { getPublicEnvironment } from "@/lib/env";

export type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

export type BookingAppointment = {
  id: string;
  confirmation_token: string;
  starts_at: string;
  ends_at: string;
  status: string;
  treatment_name: string;
  price_pence: number;
  duration_minutes: number;
};

export type BookingConfirmation = Omit<BookingAppointment, "id" | "confirmation_token"> & {
  public_token: string;
};

type BookingResponse = { appointment: BookingAppointment };

async function publicApi<T>(path: string, init?: RequestInit) {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/public-api/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: supabasePublishableKey,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? "The booking service is unavailable");
  }

  return payload as T;
}

export async function fetchAvailability(treatmentId: string, selectedDate: string) {
  return publicApi<{ slots: AvailabilitySlot[] }>(
    `availability?treatment_id=${encodeURIComponent(treatmentId)}&date=${encodeURIComponent(selectedDate)}`,
  );
}

export async function createBooking(input: {
  treatmentId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const response = await publicApi<BookingResponse>("book", {
    method: "POST",
    body: JSON.stringify({
      treatment_id: input.treatmentId,
      date: input.date,
      start_time: input.startTime,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    }),
  });

  return response.appointment;
}

export async function fetchConfirmation(token: string) {
  const response = await publicApi<{ appointment: BookingConfirmation }>(
    `confirmation?token=${encodeURIComponent(token)}`,
  );

  return response.appointment;
}
