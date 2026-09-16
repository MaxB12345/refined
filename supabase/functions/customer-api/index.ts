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

const handler = {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return options();

    const url = new URL(req.url);
    const path = url.pathname;
    const customerClient = ctx.supabase;
    const linkError = (await customerClient.rpc("link_customer_to_auth")).error;

    if (linkError) {
      console.error("Customer link failed", linkError);
      return error("Customer account could not be loaded", 500, "customer_link_failed");
    }

    if (req.method === "GET" && path.endsWith("/appointments")) {
      const { data, error: queryError } = await customerClient
        .from("appointments")
        .select("id, public_token, treatment_id, starts_at, ends_at, status, treatment_name, price_pence, duration_minutes, customer_note")
        .order("starts_at", { ascending: true })
        .limit(200);

      if (queryError) {
        console.error("Customer appointments lookup failed", queryError);
        return error("Appointments could not be loaded", 500, "appointments_failed");
      }

      return json({ appointments: data ?? [] });
    }

    if (req.method === "GET" && path.endsWith("/profile")) {
      const { data, error: queryError } = await customerClient
        .from("customers")
        .select("id, full_name, email, phone")
        .maybeSingle();

      if (queryError) {
        console.error("Customer profile lookup failed", queryError);
        return error("Profile could not be loaded", 500, "profile_failed");
      }

      return json({ profile: data });
    }

    if (req.method === "PATCH" && path.endsWith("/profile")) {
      const payload = await body(req);
      const fullName = text(payload?.full_name);
      const phone = text(payload?.phone);
      if (fullName.length < 2 || fullName.length > 120 || phone.length < 5 || phone.length > 40) {
        return error("A valid name and phone number are required", 400, "invalid_profile");
      }

      const userId = ctx.userClaims?.id ?? "";
      const { data, error: updateError } = await customerClient
        .from("customers")
        .update({ full_name: fullName, phone })
        .eq("auth_user_id", userId)
        .select("id, full_name, email, phone")
        .maybeSingle();

      if (updateError) {
        console.error("Customer profile update failed", updateError);
        return error("Profile could not be updated", 500, "profile_update_failed");
      }
      if (!data) return error("Customer profile not found", 404, "not_found");

      return json({ profile: data });
    }

    if (req.method === "POST" && path.endsWith("/cancel")) {
      const payload = await body(req);
      const appointmentId = text(payload?.appointment_id);
      if (!uuid(appointmentId)) return error("A valid appointment_id is required", 400, "invalid_appointment");

      const { data, error: cancelError } = await customerClient.rpc("cancel_customer_appointment", {
        p_appointment_id: appointmentId,
        p_reason: text(payload?.reason) || null,
      });
      const mappedError = rpcError(cancelError);
      if (mappedError) return mappedError;

      return json({ appointment: data?.[0] ?? null });
    }

    if (req.method === "POST" && path.endsWith("/reschedule")) {
      const payload = await body(req);
      const appointmentId = text(payload?.appointment_id);
      const selectedDate = text(payload?.date);
      const startTime = text(payload?.start_time);
      if (!uuid(appointmentId) || !date(selectedDate) || !time(startTime)) {
        return error("A valid appointment_id, date, and time are required", 400, "invalid_reschedule");
      }

      const { data, error: rescheduleError } = await customerClient.rpc("reschedule_customer_appointment", {
        p_appointment_id: appointmentId,
        p_date: selectedDate,
        p_start_time: startTime,
      });
      const mappedError = rpcError(rescheduleError);
      if (mappedError) return mappedError;

      return json({ appointment: data?.[0] ?? null });
    }

    return error("Endpoint not found", 404, "not_found");
  }),
};

export default handler;
