"use client";

import { useMemo, useState } from "react";

import { formatLondonTime, formatPrice, londonDateInput, londonToday } from "@/lib/date-format";
import { AppointmentDrawer, AppointmentRow, NewAppointmentDrawer } from "./appointments";
import { AlertIcon, CalendarIcon, ChevronRightIcon, ClockIcon, PlusIcon, SparkleIcon, UsersIcon } from "./icons";
import { Button, Card, CardHeader, EmptyState, useNow } from "./ui";
import { addDays, formatDay, isActive, plural, type DashboardData, type Refresh } from "./utils";
import type { AdminSection } from "./sections";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/London" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground/60">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-brand-deep">{icon}</span>
      </div>
      <p className="mt-3 font-heading text-4xl leading-none tabular-nums">{value}</p>
      <p className="mt-2 truncate text-xs text-foreground/55">{detail}</p>
    </Card>
  );
}

export function OverviewPanel({ data, refresh, displayName, navigate }: { data: DashboardData; refresh: Refresh; displayName?: string | null; navigate: (section: AdminSection) => void }) {
  const today = londonToday();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useNow();
  const customers = useMemo(() => new Map(data.customers.map((customer) => [customer.id, customer])), [data.customers]);

  const active = data.appointments.filter(isActive);
  const todays = active.filter((appointment) => londonDateInput(appointment.starts_at) === today);
  const nextToday = todays.find((appointment) => new Date(appointment.ends_at).getTime() > now);
  const weekEnd = addDays(today, 6);
  const nextWeek = active.filter((appointment) => {
    const day = londonDateInput(appointment.starts_at);
    return day >= today && day <= weekEnd;
  });
  const weekRevenue = nextWeek.reduce((sum, appointment) => sum + appointment.price_pence, 0);
  const upcoming = active.filter((appointment) => londonDateInput(appointment.starts_at) > today).slice(0, 6);
  const liveCustomers = data.customers.filter((customer) => !customer.deleted_at).length;

  const warnings: { text: string; action: string; section: AdminSection }[] = [];
  if (!data.workingHours.some((hour) => hour.is_enabled)) warnings.push({ text: "You have no opening hours set, so customers can't book online.", action: "Set opening hours", section: "availability" });
  if (!data.treatments.some((treatment) => treatment.active)) warnings.push({ text: "No treatments are live on the website.", action: "Manage treatments", section: "treatments" });
  const failedEmails = active.filter((appointment) => appointment.confirmation_email_error && new Date(appointment.starts_at).getTime() > now).length;
  if (failedEmails) warnings.push({ text: `${plural(failedEmails, "upcoming customer")} didn't receive a confirmation email. You may want to contact them.`, action: "View calendar", section: "calendar" });

  const openAppointment = data.appointments.find((appointment) => appointment.id === openId) ?? null;
  const firstName = displayName?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-deep">{formatDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">{greeting()}{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="mt-1.5 text-sm text-foreground/60">
            {todays.length ? `You have ${plural(todays.length, "appointment")} today${nextToday ? `, next at ${formatLondonTime(nextToday.starts_at)}` : ""}.` : "Nothing booked in for today."}
          </p>
        </div>
        <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>New appointment</Button>
      </div>

      {warnings.map((warning) => (
        <div key={warning.text} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <AlertIcon className="h-5 w-5 shrink-0" />
          <p className="flex-1">{warning.text}</p>
          <button type="button" onClick={() => navigate(warning.section)} className="w-fit font-semibold underline underline-offset-4">{warning.action}</button>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Today" value={String(todays.length)} detail={nextToday ? `Next: ${formatLondonTime(nextToday.starts_at)}` : "No more today"} icon={<CalendarIcon className="h-4 w-4" />} />
        <Stat label="Next 7 days" value={String(nextWeek.length)} detail="Confirmed appointments" icon={<ClockIcon className="h-4 w-4" />} />
        <Stat label="Booked income" value={formatPrice(weekRevenue)} detail="Over the next 7 days" icon={<SparkleIcon className="h-4 w-4" />} />
        <Stat label="Customers" value={String(liveCustomers)} detail="On your books" icon={<UsersIcon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Today's schedule" description={formatDay(today)} action={<Button size="sm" variant="ghost" onClick={() => navigate("calendar")}>Open calendar <ChevronRightIcon className="h-4 w-4" /></Button>} />
          <div className="p-2 sm:p-3">
            {todays.length ? (
              <div className="divide-y divide-line/70">
                {todays.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} customer={customers.get(appointment.customer_id)} onOpen={() => setOpenId(appointment.id)} />)}
              </div>
            ) : (
              <EmptyState icon={<CalendarIcon />} title="A clear day" description="No appointments today. New online bookings will appear here automatically." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Coming up" description="Your next bookings" />
          <div className="p-2 sm:p-3">
            {upcoming.length ? (
              <div className="divide-y divide-line/70">
                {upcoming.map((appointment, index) => {
                  const day = londonDateInput(appointment.starts_at);
                  const showDay = index === 0 || londonDateInput(upcoming[index - 1].starts_at) !== day;
                  return (
                    <div key={appointment.id}>
                      {showDay && <p className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-foreground/45">{day === addDays(today, 1) ? "Tomorrow" : formatDay(day, { weekday: "long", day: "numeric", month: "short" })}</p>}
                      <AppointmentRow compact appointment={appointment} customer={customers.get(appointment.customer_id)} onOpen={() => setOpenId(appointment.id)} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<ClockIcon />} title="Nothing coming up yet" description="Share your booking page to fill the diary." />
            )}
          </div>
        </Card>
      </div>

      <NewAppointmentDrawer open={creating} onClose={() => setCreating(false)} data={data} initialDate={today} refresh={refresh} />
      <AppointmentDrawer appointment={openAppointment} customer={openAppointment ? customers.get(openAppointment.customer_id) : undefined} onClose={() => setOpenId(null)} refresh={refresh} />
    </div>
  );
}
