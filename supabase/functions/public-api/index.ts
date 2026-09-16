import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  body,
  date,
  error,
  json,
  options,
  rpcError,
  text,
  time,
  uuid,
} from "../_shared/http.ts";
import { notificationColumns, sendBookingNotifications } from "../_shared/notifications.ts";

const handler = {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return options();

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET" && path.endsWith("/availability")) {
      const treatmentId = url.searchParams.get("treatment_id") ?? "";
      const selectedDate = url.searchParams.get("date") ?? "";

      if (!uuid(treatmentId) || !date(selectedDate)) {
        return error("A valid treatment_id and date are required", 400, "invalid_availability_request");
      }

      const { data, error: queryError } = await ctx.supabaseAdmin.rpc("get_available_slots", {
        p_treatment_id: treatmentId,
        p_date: selectedDate,
        p_exclude_appointment_id: null,
      });

      if (queryError) {
        console.error("Availability lookup failed", queryError);
        return error("Availability could not be loaded", 500, "availability_failed");
      }

      return json({ slots: data ?? [] });
    }

    if (req.method === "POST" && path.endsWith("/book")) {
      const payload = await body(req);
      const treatmentId = text(payload?.treatment_id);
      const selectedDate = text(payload?.date);
      const startTime = text(payload?.start_time);
      const customerName = text(payload?.customer_name);
      const customerEmail = text(payload?.customer_email).toLowerCase();
      const customerPhone = text(payload?.customer_phone);

      if (
        !uuid(treatmentId) ||
        !date(selectedDate) ||
        !time(startTime) ||
        customerName.length < 2 ||
        customerEmail.length < 5 ||
        customerPhone.length < 5
      ) {
        return error("Valid treatment, date, time, name, email, and phone are required", 400, "invalid_booking");
      }

      const { data, error: bookingError } = await ctx.supabaseAdmin.rpc("book_appointment", {
        p_treatment_id: treatmentId,
        p_date: selectedDate,
        p_start_time: startTime,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
      });

      const mappedError = rpcError(bookingError);
      if (mappedError) {
        if (bookingError?.code !== "23P01" && bookingError?.code !== "22023") {
          console.error("Booking failed", bookingError);
        }
        return mappedError;
      }

      const booking = data?.[0];
      if (!booking) return error("The booking could not be created", 500, "booking_failed");

      const notificationResult = await sendBookingNotifications({
        customerName,
        customerEmail,
        customerPhone,
        confirmationToken: booking.public_token,
        startsAt: booking.starts_at,
        treatmentName: booking.treatment_name,
        durationMinutes: booking.duration_minutes,
        pricePence: booking.price_pence,
      });
      const { error: notificationRecordError } = await ctx.supabaseAdmin
        .from("appointments")
        .update(notificationColumns(notificationResult))
        .eq("id", booking.id);
      if (notificationRecordError) console.error("Notification status could not be recorded", notificationRecordError);

      return json({
        appointment: {
          id: booking.id,
          confirmation_token: booking.public_token,
          starts_at: booking.starts_at,
          ends_at: booking.ends_at,
          status: booking.status,
          treatment_name: booking.treatment_name,
          price_pence: booking.price_pence,
          duration_minutes: booking.duration_minutes,
        },
      }, 201);
    }

    if (req.method === "GET" && path.endsWith("/confirmation")) {
      const confirmationToken = url.searchParams.get("token") ?? "";
      if (!uuid(confirmationToken)) return error("A valid confirmation token is required", 400, "invalid_token");

      const { data, error: queryError } = await ctx.supabaseAdmin
        .from("appointments")
        .select("public_token, starts_at, ends_at, status, treatment_name, price_pence, duration_minutes")
        .eq("public_token", confirmationToken)
        .maybeSingle();

      if (queryError) {
        console.error("Confirmation lookup failed", queryError);
        return error("Confirmation could not be loaded", 500, "confirmation_failed");
      }
      if (!data) return error("Confirmation not found", 404, "not_found");

      return json({ appointment: data });
    }

    return error("Endpoint not found", 404, "not_found");
  }),
};

export default handler;
