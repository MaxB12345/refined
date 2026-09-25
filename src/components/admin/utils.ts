import type { AdminAppointment, getAdminDashboardData } from "@/lib/admin-api";
import { londonDateInput } from "@/lib/date-format";

export { addDays, formatDay, startOfWeek, weekdayOf } from "@/lib/date-format";

export type DashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
export type Refresh = () => Promise<void>;

/** Monday-first, matching how the week reads in the UK. */
export const weekOrder = [1, 2, 3, 4, 5, 6, 0];
export const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function hhmm(value: string) {
  return value.slice(0, 5);
}

/** `datetime-local` value in the admin's browser time zone. */
export function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function isActive(appointment: AdminAppointment) {
  return appointment.status === "confirmed" || appointment.status === "completed";
}

export function onDay(appointments: AdminAppointment[], day: string) {
  return appointments.filter((appointment) => londonDateInput(appointment.starts_at) === day);
}

export const statusMeta: Record<AdminAppointment["status"], { label: string; tone: "success" | "neutral" | "danger" | "warning" }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "warning" },
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
