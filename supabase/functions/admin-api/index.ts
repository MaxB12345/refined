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

const resources = [
  "treatments",
  "working_hours",
  "blocked_times",
  "business_profile",
  "business_settings",
  "gallery_items",
  "customers",
  "appointments",
] as const;

type Resource = (typeof resources)[number];

const writableFields: Record<Resource, string[]> = {
  treatments: ["name", "slug", "description", "price_pence", "duration_minutes", "active", "display_order"],
  working_hours: ["day_of_week", "starts_at", "ends_at", "is_enabled"],
  blocked_times: ["starts_at", "ends_at", "reason"],
  business_profile: ["business_name", "beautician_name", "tagline", "about_heading", "about_body", "contact_email", "contact_phone", "location", "instagram_url", "whatsapp_number"],
  business_settings: ["timezone", "slot_interval_minutes", "cancellation_notice_hours", "minimum_booking_notice_minutes", "buffer_minutes"],
  gallery_items: ["slug", "storage_path", "image_url", "alt_text", "caption", "display_order", "published"],
  customers: ["full_name", "email", "phone"],
  appointments: ["customer_note", "admin_note", "cancellation_reason"],
};

function resource(value: string | null): Resource | null {
  return resources.includes(value as Resource) ? value as Resource : null;
}

function fieldsFor(resourceName: Resource, payload: Record<string, unknown>) {
  return Object.fromEntries(
    writableFields[resourceName]
      .filter((field) => field in payload)
      .map((field) => [field, payload[field]]),
  );
}

function databaseError(message = "The admin operation failed") {
  return error(message, 500, "database_error");
}

const handler = {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return options();

    const userId = ctx.userClaims?.id ?? "";
    const { data: admin, error: adminError } = await ctx.supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminError) {
      console.error("Admin authorization lookup failed", adminError);
      return error("Admin access could not be verified", 500, "authorization_failed");
    }
    if (!admin) return error("Admin access required", 403, "forbidden");

    const url = new URL(req.url);
    const resourceName = resource(url.searchParams.get("resource"));
    const operation = url.searchParams.get("operation") ?? "create";
    const id = url.searchParams.get("id");
    const singleton = resourceName === "business_profile" || resourceName === "business_settings";

    if (!resourceName) return error("A valid resource is required", 400, "invalid_resource");
    if (id && !singleton && !uuid(id)) return error("A valid id is required", 400, "invalid_id");

    if (req.method === "GET") {
      let query = ctx.supabase.from(resourceName).select("*").limit(500);
      if (singleton) query = query.eq("id", true);
      if (id && !singleton) query = query.eq("id", id);
      if (resourceName === "appointments") query = query.order("starts_at", { ascending: true });
      if (resourceName === "treatments" || resourceName === "gallery_items") {
        query = query.order("display_order", { ascending: true });
      }

      const { data, error: queryError } = await query;
      if (queryError) {
        console.error("Admin list failed", queryError);
        return databaseError();
      }
      return json({ resource: resourceName, records: data ?? [] });
    }

    const payload = await body(req);

    if (req.method === "POST" && resourceName === "appointments" && operation === "create") {
      const treatmentId = text(payload?.treatment_id);
      const selectedDate = text(payload?.date);
      const startTime = text(payload?.start_time);
      const customerName = text(payload?.customer_name);
      const customerEmail = text(payload?.customer_email).toLowerCase();
      const customerPhone = text(payload?.customer_phone);

      if (!uuid(treatmentId) || !date(selectedDate) || !time(startTime) || customerName.length < 2 || customerEmail.length < 5 || customerPhone.length < 5) {
        return error("Valid treatment, date, time, name, email, and phone are required", 400, "invalid_appointment");
      }

      const { data, error: createError } = await ctx.supabaseAdmin.rpc("book_appointment", {
        p_treatment_id: treatmentId,
        p_date: selectedDate,
        p_start_time: startTime,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
      });
      const mappedError = rpcError(createError);
      if (mappedError) return mappedError;
      const appointment = data?.[0];
      if (appointment) {
        const notificationResult = await sendBookingNotifications({
          customerName,
          customerEmail,
          customerPhone,
          confirmationToken: appointment.public_token,
          startsAt: appointment.starts_at,
          treatmentName: appointment.treatment_name,
          durationMinutes: appointment.duration_minutes,
          pricePence: appointment.price_pence,
        });
        const { error: notificationRecordError } = await ctx.supabaseAdmin
          .from("appointments")
          .update(notificationColumns(notificationResult))
          .eq("id", appointment.id);
        if (notificationRecordError) console.error("Notification status could not be recorded", notificationRecordError);
      }
      return json({ appointment: appointment ?? null }, 201);
    }

    if (req.method === "POST" && resourceName === "appointments" && id && operation === "cancel") {
      const { data, error: cancelError } = await ctx.supabase.rpc("admin_cancel_appointment", {
        p_appointment_id: id,
        p_reason: text(payload?.reason) || null,
      });
      const mappedError = rpcError(cancelError);
      if (mappedError) return mappedError;
      return json({ appointment: data?.[0] ?? null });
    }

    if (req.method === "POST" && resourceName === "appointments" && id && operation === "reschedule") {
      const selectedDate = text(payload?.date);
      const startTime = text(payload?.start_time);
      if (!date(selectedDate) || !time(startTime)) {
        return error("A valid date and time are required", 400, "invalid_reschedule");
      }

      const { data, error: rescheduleError } = await ctx.supabase.rpc("admin_reschedule_appointment", {
        p_appointment_id: id,
        p_date: selectedDate,
        p_start_time: startTime,
      });
      const mappedError = rpcError(rescheduleError);
      if (mappedError) return mappedError;
      return json({ appointment: data?.[0] ?? null });
    }

    if (req.method === "POST") {
      const values = fieldsFor(resourceName, payload ?? {});
      if (!Object.keys(values).length) return error("No writable fields were supplied", 400, "empty_payload");

      const query = singleton
        ? ctx.supabase.from(resourceName).upsert({ id: true, ...values }).select().single()
        : ctx.supabase.from(resourceName).insert(values).select().single();
      const { data, error: createError } = await query;
      if (createError) {
        console.error("Admin create failed", createError);
        return databaseError();
      }
      return json({ record: data }, 201);
    }

    if (req.method === "PATCH") {
      if (!singleton && !id) return error("An id is required", 400, "missing_id");
      const values = fieldsFor(resourceName, payload ?? {});
      if (!Object.keys(values).length) return error("No writable fields were supplied", 400, "empty_payload");

      let query = ctx.supabase.from(resourceName).update(values);
      query = query.eq("id", singleton ? true : id);
      const { data, error: updateError } = await query.select().single();
      if (updateError) {
        console.error("Admin update failed", updateError);
        return databaseError();
      }
      return json({ record: data });
    }

    if (req.method === "DELETE") {
      if (singleton) return error("Singleton records cannot be deleted", 405, "not_supported");
      if (!id) return error("An id is required", 400, "missing_id");

      if (resourceName === "appointments") {
        const { data, error: cancelError } = await ctx.supabase.rpc("admin_cancel_appointment", {
          p_appointment_id: id,
          p_reason: "Removed by admin",
        });
        const mappedError = rpcError(cancelError);
        if (mappedError) return mappedError;
        return json({ appointment: data?.[0] ?? null });
      }

      if (resourceName === "customers") {
        const deletedEmail = `deleted-${crypto.randomUUID()}@invalid.local`;
        const { data, error: anonymizeError } = await ctx.supabase
          .from("customers")
          .update({
            full_name: "Deleted customer",
            email: deletedEmail,
            phone: "removed",
            auth_user_id: null,
            deleted_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id, full_name, email, phone, deleted_at")
          .single();
        if (anonymizeError) {
          console.error("Customer anonymization failed", anonymizeError);
          return databaseError();
        }
        return json({ record: data });
      }

      let storagePath: string | null = null;
      if (resourceName === "gallery_items") {
        const existing = await ctx.supabase.from("gallery_items").select("storage_path").eq("id", id).maybeSingle();
        storagePath = existing.data?.storage_path ?? null;
      }

      const { error: deleteError } = await ctx.supabase.from(resourceName).delete().eq("id", id);
      if (deleteError) {
        console.error("Admin delete failed", deleteError);
        return databaseError();
      }
      if (storagePath) await ctx.supabase.storage.from("gallery").remove([storagePath]);
      return json({ deleted: true });
    }

    return error("Method not allowed", 405, "method_not_allowed");
  }),
};

export default handler;
