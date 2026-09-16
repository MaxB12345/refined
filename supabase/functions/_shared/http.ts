export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function options() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function error(message: string, status = 400, code?: string) {
  return json({ error: code ?? "request_failed", message }, status);
}

export async function body(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function uuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
}

export function date(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text(value));
}

export function time(value: unknown) {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text(value));
}

export function rpcError(errorValue: { code?: string; message?: string } | null) {
  if (!errorValue) return null;
  if (errorValue.code === "23P01") return error("That appointment time is no longer available", 409, "slot_unavailable");
  if (errorValue.code === "42501") return error(errorValue.message ?? "This appointment cannot be changed", 409, "appointment_not_changeable");
  if (errorValue.code === "22023") return error(errorValue.message ?? "Invalid booking details", 400, "invalid_booking");
  if (errorValue.code === "P0002") return error(errorValue.message ?? "Record not found", 404, "not_found");
  return error("The database operation failed", 500, "database_error");
}
