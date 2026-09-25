"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { fetchAvailability, type AvailabilitySlot } from "@/lib/booking-api";
import {
  cancelAdminAppointment,
  createAdminAppointment,
  rescheduleAdminAppointment,
  updateAdminRecord,
  type AdminAppointment,
  type AdminCustomer,
} from "@/lib/admin-api";
import { formatLondonDate, formatLondonTime, formatPrice, londonDateInput, londonTimeInput, londonToday } from "@/lib/date-format";
import { Skeleton } from "@/components/ui/loading";
import {
  AlertIcon,
  BanIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";
import { Badge, Button, Card, Drawer, EmptyState, Field, IconButton, PageHeader, Switch, errorMessage, inputClass, textareaClass, useFeedback } from "./ui";
import { addDays, formatDay, hhmm, isActive, onDay, plural, startOfWeek, statusMeta, weekdayOf, type DashboardData, type Refresh } from "./utils";

export function AppointmentRow({ appointment, customer, onOpen, compact = false }: { appointment: AdminAppointment; customer?: AdminCustomer; onOpen: () => void; compact?: boolean }) {
  const status = statusMeta[appointment.status];
  const muted = !isActive(appointment);
  return (
    <button type="button" onClick={onOpen} className={`group flex w-full items-stretch gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface/70 sm:px-4 ${muted ? "opacity-60" : ""}`}>
      <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
        <p className="text-sm font-bold tabular-nums">{formatLondonTime(appointment.starts_at)}</p>
        <p className="text-xs tabular-nums text-foreground/50">{formatLondonTime(appointment.ends_at)}</p>
      </div>
      <span className={`w-1 shrink-0 rounded-full ${muted ? "bg-line" : "bg-brand"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold">{customer?.full_name ?? "Unknown customer"}</p>
          {appointment.status !== "confirmed" && <Badge tone={status.tone}>{status.label}</Badge>}
          {appointment.confirmation_email_error && isActive(appointment) && <Badge tone="warning">Email not sent</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-foreground/65">
          {appointment.treatment_name} · {appointment.duration_minutes} min{compact ? "" : ` · ${formatPrice(appointment.price_pence)}`}
        </p>
        {!compact && appointment.admin_note && <p className="mt-1 truncate text-xs text-foreground/50">Note: {appointment.admin_note}</p>}
      </div>
      <ChevronRightIcon className="h-4 w-4 self-center text-foreground/30 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function TimePicker({ treatmentId, date, value, onChange }: { treatmentId: string; date: string; value: string; onChange: (value: string) => void }) {
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [manual, setManual] = useState(false);
  const ready = Boolean(treatmentId && date);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const task = window.setTimeout(() => {
      setSlots(null);
      setFailed(false);
      fetchAvailability(treatmentId, date)
        .then((result) => { if (!controller.signal.aborted) setSlots(result.slots); })
        .catch(() => { if (!controller.signal.aborted) { setFailed(true); setSlots([]); } });
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(task);
    };
  }, [ready, treatmentId, date]);

  if (!ready) return <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-foreground/55">Choose a treatment and date to see free times.</p>;

  return (
    <div>
      {slots === null ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div>
      ) : slots.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const time = londonTimeInput(slot.starts_at);
            return (
              <button key={slot.starts_at} type="button" onClick={() => { onChange(time); setManual(false); }} className={`h-10 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${value === time && !manual ? "border-foreground bg-foreground text-white" : "border-line bg-white hover:border-brand"}`}>
                {formatLondonTime(slot.starts_at)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-foreground/70">{failed ? "Free times couldn't be loaded." : "No free times on this day."} You can still enter a time below.</p>
      )}
      <div className="mt-3">
        {manual || (slots !== null && !slots.length) ? (
          <input type="time" aria-label="Start time" value={value} onChange={(event) => onChange(event.target.value)} required className={`${inputClass} max-w-40`} />
        ) : (
          <button type="button" onClick={() => setManual(true)} className="text-xs font-semibold text-brand-deep underline decoration-brand underline-offset-4">Enter a different time</button>
        )}
      </div>
    </div>
  );
}

export function NewAppointmentDrawer({ open, onClose, data, initialDate, refresh }: { open: boolean; onClose: () => void; data: DashboardData; initialDate: string; refresh: Refresh }) {
  const { notify } = useFeedback();
  const activeTreatments = data.treatments.filter((treatment) => treatment.active);
  const [form, setForm] = useState({ treatment_id: "", date: initialDate, start_time: "", customer_name: "", customer_email: "", customer_phone: "" });
  const [customerQuery, setCustomerQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (open && openedFor !== initialDate) {
    setOpenedFor(initialDate);
    setForm({ treatment_id: activeTreatments[0]?.id ?? "", date: initialDate, start_time: "", customer_name: "", customer_email: "", customer_phone: "" });
    setCustomerQuery("");
    setError("");
  }
  if (!open && openedFor !== null) setOpenedFor(null);

  const matches = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return data.customers.filter((customer) => !customer.deleted_at && `${customer.full_name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query)).slice(0, 5);
  }, [customerQuery, data.customers]);

  const treatment = activeTreatments.find((item) => item.id === form.treatment_id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.start_time) return setError("Choose a start time.");
    setBusy(true);
    setError("");
    try {
      await createAdminAppointment(form);
      await refresh();
      notify(`Booked ${form.customer_name} for ${formatDay(form.date)} at ${form.start_time}.`);
      onClose();
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "The appointment could not be created."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New appointment"
      description="The customer gets the same confirmation email as an online booking."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="new-appointment" loading={busy}>Book appointment</Button></>}
    >
      <form id="new-appointment" onSubmit={submit} className="space-y-7">
        <section className="space-y-4">
          <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">1 · Treatment and time</h3>
          <Field label="Treatment">
            {(id) => (
              <select id={id} value={form.treatment_id} onChange={(event) => setForm({ ...form, treatment_id: event.target.value, start_time: "" })} required className={inputClass}>
                {!activeTreatments.length && <option value="">No live treatments</option>}
                {activeTreatments.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.duration_minutes} min, {formatPrice(item.price_pence)}</option>)}
              </select>
            )}
          </Field>
          <Field label="Date">
            {(id) => <input id={id} type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value, start_time: "" })} required className={inputClass} />}
          </Field>
          <div>
            <p className="text-sm font-semibold">Start time</p>
            <div className="mt-1.5"><TimePicker treatmentId={form.treatment_id} date={form.date} value={form.start_time} onChange={(start_time) => setForm((current) => ({ ...current, start_time }))} /></div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">2 · Customer</h3>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-foreground/35" />
            <input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search existing customers" aria-label="Search existing customers" className={`${inputClass} pl-11`} />
            {matches.length > 0 && (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {matches.map((customer) => (
                  <li key={customer.id}>
                    <button type="button" onClick={() => { setForm({ ...form, customer_name: customer.full_name, customer_email: customer.email, customer_phone: customer.phone }); setCustomerQuery(""); }} className="block w-full px-4 py-2.5 text-left hover:bg-surface">
                      <span className="block text-sm font-semibold">{customer.full_name}</span>
                      <span className="block truncate text-xs text-foreground/55">{customer.email} · {customer.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Field label="Full name">{(id) => <input id={id} value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} required minLength={2} autoComplete="off" className={inputClass} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">{(id) => <input id={id} type="email" value={form.customer_email} onChange={(event) => setForm({ ...form, customer_email: event.target.value })} required autoComplete="off" className={inputClass} />}</Field>
            <Field label="Phone">{(id) => <input id={id} type="tel" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} required minLength={5} autoComplete="off" className={inputClass} />}</Field>
          </div>
        </section>

        {treatment && form.start_time && (
          <div className="rounded-2xl bg-surface p-4 text-sm">
            <p className="font-semibold">{treatment.name}</p>
            <p className="mt-0.5 text-foreground/65">{formatDay(form.date)} at {form.start_time} · {treatment.duration_minutes} min · {formatPrice(treatment.price_pence)}</p>
          </div>
        )}
        {error && <p role="alert" className="flex gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertIcon className="h-5 w-5" />{error}</p>}
      </form>
    </Drawer>
  );
}

export function AppointmentDrawer({ appointment, customer, onClose, refresh }: { appointment: AdminAppointment | null; customer?: AdminCustomer; onClose: () => void; refresh: Refresh }) {
  const { notify, confirm } = useFeedback();
  const [note, setNote] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState<"" | "note" | "reschedule" | "cancel">("");
  const [shownId, setShownId] = useState<string | null>(null);

  if (appointment && appointment.id !== shownId) {
    setShownId(appointment.id);
    setNote(appointment.admin_note ?? "");
    setRescheduling(false);
    setNewDate(londonDateInput(appointment.starts_at));
    setNewTime("");
  }

  if (!appointment) return null;

  const status = statusMeta[appointment.status];
  const canChange = appointment.status === "confirmed" && new Date(appointment.starts_at) > new Date();

  async function saveNote() {
    if (!appointment) return;
    setBusy("note");
    try {
      await updateAdminRecord("appointments", appointment.id, { admin_note: note.trim() || null });
      await refresh();
      notify("Note saved.");
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The note could not be saved."), "error");
    } finally {
      setBusy("");
    }
  }

  async function reschedule() {
    if (!appointment || !newTime) return notify("Choose a new start time.", "error");
    setBusy("reschedule");
    try {
      await rescheduleAdminAppointment(appointment.id, newDate, newTime);
      await refresh();
      notify(`Moved to ${formatDay(newDate)} at ${newTime}.`);
      setRescheduling(false);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The appointment could not be rescheduled."), "error");
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    if (!appointment) return;
    const answer = await confirm({
      title: "Cancel this appointment?",
      message: `${customer?.full_name ?? "The customer"}'s ${appointment.treatment_name} on ${formatLondonDate(appointment.starts_at)} will be cancelled and the time freed up.`,
      confirmLabel: "Cancel appointment",
      reasonLabel: "Reason (for your records)",
    });
    if (!answer.confirmed) return;
    setBusy("cancel");
    try {
      await cancelAdminAppointment(appointment.id, answer.reason || "Cancelled by admin");
      await refresh();
      notify("Appointment cancelled.");
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The appointment could not be cancelled."), "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <Drawer
      open
      focusField={false}
      onClose={onClose}
      title={appointment.treatment_name}
      description={`${formatLondonDate(appointment.starts_at)} · ${formatLondonTime(appointment.starts_at)}–${formatLondonTime(appointment.ends_at)}`}
      footer={canChange ? <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<BanIcon className="h-4 w-4" />} loading={busy === "cancel"} onClick={cancel}>Cancel appointment</Button> : undefined}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={status.tone} dot>{status.label}</Badge>
          {appointment.confirmation_email_error && <Badge tone="warning">Confirmation email failed</Badge>}
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
          {[
            ["Duration", `${appointment.duration_minutes} minutes`],
            ["Price", formatPrice(appointment.price_pence)],
            ["Reference", `#${appointment.public_token.slice(0, 8)}`],
            ["Starts", formatLondonTime(appointment.starts_at)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-4 py-3">
              <dt className="text-xs text-foreground/55">{label}</dt>
              <dd className="mt-0.5 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">Customer</h3>
          <Card className="mt-3 p-4">
            <p className="font-semibold">{customer?.full_name ?? "Unknown customer"}</p>
            {customer && !customer.deleted_at && (
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 break-all text-foreground/75 hover:text-foreground"><MailIcon className="h-4 w-4 text-brand-deep" />{customer.email}</a>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-foreground/75 hover:text-foreground"><PhoneIcon className="h-4 w-4 text-brand-deep" />{customer.phone}</a>
              </div>
            )}
            {appointment.customer_note && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm"><span className="font-semibold">Their note: </span>{appointment.customer_note}</p>}
          </Card>
        </section>

        {appointment.status === "cancelled" && appointment.cancellation_reason && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><span className="font-semibold">Cancellation reason: </span>{appointment.cancellation_reason}</p>
        )}

        {canChange && (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">Reschedule</h3>
              {!rescheduling && <Button size="sm" variant="secondary" icon={<ClockIcon className="h-4 w-4" />} onClick={() => setRescheduling(true)}>Change time</Button>}
            </div>
            {rescheduling && (
              <Card className="mt-3 space-y-4 p-4">
                <Field label="New date">{(id) => <input id={id} type="date" min={londonToday()} value={newDate} onChange={(event) => { setNewDate(event.target.value); setNewTime(""); }} className={inputClass} />}</Field>
                <div>
                  <p className="text-sm font-semibold">New start time</p>
                  <div className="mt-1.5"><TimePicker treatmentId={appointment.treatment_id} date={newDate} value={newTime} onChange={setNewTime} /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setRescheduling(false)}>Never mind</Button>
                  <Button size="sm" loading={busy === "reschedule"} onClick={reschedule}>Save new time</Button>
                </div>
              </Card>
            )}
          </section>
        )}

        <section>
          <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">Private note</h3>
          <p className="mt-1 text-xs text-foreground/55">Only visible to you — e.g. allergies, preferences, patch test done.</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} aria-label="Private note" className={`${textareaClass} mt-3`} />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="secondary" loading={busy === "note"} disabled={note === (appointment.admin_note ?? "")} onClick={saveNote}>Save note</Button>
          </div>
        </section>
      </div>
    </Drawer>
  );
}

export function AppointmentsPanel({ data, refresh, focusDay }: { data: DashboardData; refresh: Refresh; focusDay?: string }) {
  const today = londonToday();
  const [selectedDay, setSelectedDay] = useState(focusDay ?? today);
  const [showCancelled, setShowCancelled] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const customers = useMemo(() => new Map(data.customers.map((customer) => [customer.id, customer])), [data.customers]);
  const weekStart = startOfWeek(selectedDay);
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayAppointments = onDay(data.appointments, selectedDay);
  const visible = showCancelled ? dayAppointments : dayAppointments.filter(isActive);
  const cancelledCount = dayAppointments.length - dayAppointments.filter(isActive).length;
  const dayRevenue = dayAppointments.filter(isActive).reduce((sum, appointment) => sum + appointment.price_pence, 0);

  const weekday = weekdayOf(selectedDay);
  const hours = data.workingHours.filter((hour) => hour.day_of_week === weekday && hour.is_enabled).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const dayStart = new Date(`${selectedDay}T00:00:00`).getTime();
  const dayEnd = new Date(`${addDays(selectedDay, 1)}T00:00:00`).getTime();
  const timeOff = data.blockedTimes.filter((block) => new Date(block.starts_at).getTime() < dayEnd && new Date(block.ends_at).getTime() > dayStart);
  const openAppointment = data.appointments.find((appointment) => appointment.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Pick a day to see who's booked in. Tap an appointment to reschedule, cancel or add a private note."
        actions={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>New appointment</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1">
            <IconButton label="Previous week" onClick={() => setSelectedDay(addDays(selectedDay, -7))}><ChevronLeftIcon /></IconButton>
            <IconButton label="Next week" onClick={() => setSelectedDay(addDays(selectedDay, 7))}><ChevronRightIcon /></IconButton>
            <p className="ml-2 font-semibold">{formatDay(weekStart, { month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedDay !== today && <Button size="sm" variant="secondary" onClick={() => setSelectedDay(today)}>Today</Button>}
            <input type="date" aria-label="Jump to date" value={selectedDay} onChange={(event) => event.target.value && setSelectedDay(event.target.value)} className="h-9 rounded-full border border-line bg-white px-3 text-xs font-semibold" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 p-2 sm:gap-2 sm:p-3">
          {week.map((day) => {
            const count = onDay(data.appointments, day).filter(isActive).length;
            const selected = day === selectedDay;
            const closed = !data.workingHours.some((hour) => hour.day_of_week === weekdayOf(day) && hour.is_enabled);
            return (
              <button key={day} type="button" onClick={() => setSelectedDay(day)} aria-pressed={selected} className={`flex flex-col items-center rounded-xl px-1 py-2.5 transition-colors ${selected ? "bg-foreground text-white" : "hover:bg-surface"} ${closed && !selected ? "text-foreground/40" : ""}`}>
                <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${selected ? "text-white/70" : "text-foreground/50"}`}>{formatDay(day, { weekday: "short" })}</span>
                <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold tabular-nums ${day === today && !selected ? "ring-2 ring-brand" : ""}`}>{Number(day.slice(8))}</span>
                <span className={`mt-1 h-4 whitespace-nowrap text-[0.65rem] font-semibold ${selected ? "text-white/80" : "text-brand-deep"}`}>
                  {count ? <>{count}<span className="hidden sm:inline"> booked</span></> : closed ? <><span className="sm:hidden">Off</span><span className="hidden sm:inline">Closed</span></> : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-sans text-base font-semibold tracking-normal">{formatDay(selectedDay, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
            <p className="mt-0.5 text-sm text-foreground/60">
              {hours.length ? `Open ${hours.map((hour) => `${hhmm(hour.starts_at)}–${hhmm(hour.ends_at)}`).join(", ")}` : "Closed"}
              {" · "}{plural(dayAppointments.filter(isActive).length, "appointment")}{dayRevenue ? ` · ${formatPrice(dayRevenue)}` : ""}
            </p>
          </div>
          {cancelledCount > 0 && <div className="w-48"><Switch checked={showCancelled} onChange={setShowCancelled} label={`Show cancelled (${cancelledCount})`} /></div>}
        </div>
        {timeOff.length > 0 && (
          <div className="border-b border-line bg-amber-50/60 px-5 py-3 text-sm text-amber-900 sm:px-6">
            {timeOff.map((block) => <p key={block.id}><span className="font-semibold">Time off</span> {formatLondonTime(block.starts_at)}–{formatLondonTime(block.ends_at)}{block.reason ? ` · ${block.reason}` : ""}</p>)}
          </div>
        )}
        <div className="p-2 sm:p-3">
          {visible.length ? (
            <div className="divide-y divide-line/70">
              {visible.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} customer={customers.get(appointment.customer_id)} onOpen={() => setOpenId(appointment.id)} />)}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarIcon />}
              title={`Nothing booked ${selectedDay === today ? "today" : `on ${formatDay(selectedDay)}`}`}
              description={hours.length ? "This day is open for online bookings. You can also add an appointment yourself." : "You're closed this day, so customers can't book online."}
              action={<Button size="sm" variant="secondary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>Add appointment</Button>}
            />
          )}
        </div>
      </Card>

      <NewAppointmentDrawer open={creating} onClose={() => setCreating(false)} data={data} initialDate={selectedDay < today ? today : selectedDay} refresh={refresh} />
      <AppointmentDrawer appointment={openAppointment} customer={openAppointment ? customers.get(openAppointment.customer_id) : undefined} onClose={() => setOpenId(null)} refresh={refresh} />
    </div>
  );
}

