"use client";

import { useEffect, useEffectEvent, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  cancelAdminAppointment,
  createAdminAppointment,
  createAdminRecord,
  deleteAdminRecord,
  getAdminDashboardData,
  rescheduleAdminAppointment,
  updateAdminRecord,
  type AdminBlockedTime,
  type AdminCustomer,
  type AdminGalleryItem,
  type AdminProfile,
  type AdminSettings,
  type AdminTreatment,
  type AdminWorkingHour,
} from "@/lib/admin-api";
import { formatLondonDate, formatLondonTime, formatPrice, londonDateInput, londonToday } from "@/lib/date-format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tabs = [
  ["calendar", "Calendar"],
  ["treatments", "Treatments"],
  ["availability", "Availability"],
  ["customers", "Customers"],
  ["content", "Content"],
] as const;

function inputTime(value: string) {
  return value.slice(0, 5);
}

function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function PanelMessage({ error, message }: { error: string; message: string }) {
  return (
    <>
      {message && <p role="status" className="mt-4 text-sm text-brand-deep">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm">{error}</p>}
    </>
  );
}

export function AdminDashboard({ displayName }: { displayName?: string | null }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>("calendar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setData(await getAdminDashboardData());
      setError("");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The admin dashboard could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  const loadForEffect = useEffectEvent(load);
  useEffect(() => {
    const task = window.setTimeout(() => void loadForEffect(), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-sm text-foreground/65">Loading admin workspace...</main>;
  if (!data) return <main className="mx-auto min-h-screen max-w-7xl px-6 py-16"><p role="alert" className="rounded-2xl bg-surface px-5 py-4 text-sm">{error || "Admin workspace unavailable"}</p></main>;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <header className="flex flex-col justify-between gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Sculpted by Ruby</p>
          <h1 className="mt-4 text-5xl leading-tight">Admin workspace.</h1>
          <p className="mt-2 text-sm text-foreground/65">{displayName ? `Welcome, ${displayName}.` : "Manage the business in one place."}</p>
        </div>
        <button type="button" onClick={signOut} className="w-fit text-sm font-semibold underline decoration-brand underline-offset-4">Sign out</button>
      </header>
      <nav className="-mx-2 flex gap-1 overflow-x-auto py-5" aria-label="Admin sections">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeTab === key ? "bg-foreground text-white" : "text-foreground/65 hover:bg-surface"}`}>
            {label}
          </button>
        ))}
      </nav>
      {activeTab === "calendar" && <AppointmentPanel data={data} refresh={load} />}
      {activeTab === "treatments" && <TreatmentsPanel treatments={data.treatments} refresh={load} />}
      {activeTab === "availability" && <AvailabilityPanel workingHours={data.workingHours} blockedTimes={data.blockedTimes} refresh={load} />}
      {activeTab === "customers" && <CustomersPanel customers={data.customers} refresh={load} />}
      {activeTab === "content" && <ContentPanel profile={data.profile} settings={data.settings} gallery={data.gallery} refresh={load} />}
    </main>
  );
}

function AppointmentPanel({ data, refresh }: { data: DashboardData; refresh: () => Promise<void> }) {
  const [selectedDay, setSelectedDay] = useState(londonToday());
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const appointments = data.appointments.filter((appointment) => londonDateInput(appointment.starts_at) === selectedDay);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await createAdminAppointment(values);
      event.currentTarget.reset();
      setShowCreate(false);
      setMessage("Appointment created.");
      await refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Appointment could not be created");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this appointment?")) return;
    setBusy(true);
    try {
      await cancelAdminAppointment(id, "Cancelled by admin");
      await refresh();
      setMessage("Appointment cancelled.");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Appointment could not be cancelled");
    } finally {
      setBusy(false);
    }
  }

  async function reschedule(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await rescheduleAdminAppointment(id, String(values.date), String(values.start_time));
      setEditingId("");
      await refresh();
      setMessage("Appointment rescheduled.");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Appointment could not be rescheduled");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">Appointments</p><h2 className="mt-3 text-4xl">Calendar</h2></div>
        <div className="flex flex-wrap gap-3"><input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><button type="button" onClick={() => setShowCreate((value) => !value)} className="h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-white hover:bg-brand-deep">{showCreate ? "Close form" : "New appointment"}</button></div>
      </div>
      {showCreate && <form onSubmit={create} className="mt-6 grid gap-4 rounded-[1.5rem] bg-surface p-6 sm:grid-cols-2">
        <h3 className="font-heading text-2xl sm:col-span-2">Create appointment</h3>
        <select name="treatment_id" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm"><option value="">Treatment</option>{data.treatments.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input name="date" type="date" defaultValue={selectedDay} required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" />
        <input name="start_time" type="time" defaultValue="09:00" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" />
        <input name="customer_name" placeholder="Customer name" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" />
        <input name="customer_email" type="email" placeholder="Customer email" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" />
        <input name="customer_phone" type="tel" placeholder="Customer phone" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" />
        <button disabled={busy} className="h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Creating..." : "Create appointment"}</button>
      </form>}
      <div className="mt-8 space-y-4">
        {!appointments.length && <div className="rounded-[1.5rem] border border-line bg-surface p-7 text-sm text-foreground/65">No appointments on this date.</div>}
        {appointments.map((appointment) => <article key={appointment.id} className={`rounded-[1.5rem] border border-line bg-white p-6 ${appointment.status !== "confirmed" ? "opacity-65" : ""}`}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h3 className="font-heading text-3xl">{appointment.treatment_name}</h3><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold capitalize">{appointment.status.replace("_", " ")}</span></div><p className="mt-3 text-sm font-semibold">{formatLondonTime(appointment.starts_at)} · {appointment.duration_minutes} mins · {formatPrice(appointment.price_pence)}</p><p className="mt-2 text-sm text-foreground/65">Customer ID: {appointment.customer_id.slice(0, 8)}</p></div>{appointment.status === "confirmed" && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditingId(editingId === appointment.id ? "" : appointment.id)} className="rounded-full border border-line px-4 py-2 text-xs font-semibold hover:bg-surface">Reschedule</button><button type="button" onClick={() => cancel(appointment.id)} disabled={busy} className="rounded-full px-4 py-2 text-xs font-semibold text-brand-deep hover:bg-surface">Cancel</button></div>}</div>
          {editingId === appointment.id && <form onSubmit={(event) => reschedule(event, appointment.id)} className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row"><input name="date" type="date" defaultValue={londonDateInput(appointment.starts_at)} required className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input name="start_time" type="time" defaultValue={inputTime(formatLondonTime(appointment.starts_at))} required className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><button disabled={busy} className="h-10 rounded-full bg-foreground px-4 text-xs font-semibold text-white disabled:opacity-50">Save time</button></form>}
        </article>)}
      </div>
      <PanelMessage error={error} message={message} />
    </section>
  );
}

function TreatmentsPanel({ treatments, refresh }: { treatments: AdminTreatment[]; refresh: () => Promise<void> }) {
  const blank = { name: "", slug: "", description: "", price_pence: "", duration_minutes: "", display_order: "0", active: true };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...form, price_pence: Number(form.price_pence), duration_minutes: Number(form.duration_minutes), display_order: Number(form.display_order) };
    try { if (editingId) await updateAdminRecord("treatments", editingId, payload); else await createAdminRecord("treatments", payload); setForm(blank); setEditingId(""); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Treatment could not be saved"); }
  }

  return <section><div className="flex items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">Menu</p><h2 className="mt-3 text-4xl">Treatments</h2></div><button type="button" onClick={() => { setForm(blank); setEditingId(""); }} className="text-sm font-semibold underline decoration-brand underline-offset-4">Add new</button></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]"><form onSubmit={save} className="h-fit grid gap-3 rounded-[1.5rem] bg-surface p-6"><h3 className="font-heading text-2xl">{editingId ? "Edit treatment" : "New treatment"}</h3><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="Slug" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" rows={3} className="rounded-xl border border-line bg-background px-3 py-3 text-sm" /><div className="grid grid-cols-2 gap-3"><input value={form.price_pence} onChange={(event) => setForm({ ...form, price_pence: event.target.value })} placeholder="Price pence" type="number" min="0" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><input value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} placeholder="Minutes" type="number" min="5" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /></div><button className="h-11 rounded-full bg-foreground text-sm font-semibold text-white hover:bg-brand-deep">{editingId ? "Save treatment" : "Add treatment"}</button></form><div className="space-y-3">{treatments.map((treatment) => <div key={treatment.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5"><div><p className="font-heading text-2xl">{treatment.name}</p><p className="mt-1 text-xs text-foreground/60">{formatPrice(treatment.price_pence)} · {treatment.duration_minutes} mins · {treatment.active ? "Active" : "Hidden"}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(treatment.id); setForm({ name: treatment.name, slug: treatment.slug, description: treatment.description ?? "", price_pence: String(treatment.price_pence), duration_minutes: String(treatment.duration_minutes), display_order: String(treatment.display_order), active: treatment.active }); }} className="rounded-full border border-line px-3 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={async () => { if (window.confirm("Delete this treatment?")) { await deleteAdminRecord("treatments", treatment.id); await refresh(); } }} className="rounded-full px-3 py-2 text-xs font-semibold text-brand-deep">Delete</button></div></div>)}</div></div><PanelMessage error={error} message="" /></section>;
}

function AvailabilityPanel({ workingHours, blockedTimes, refresh }: { workingHours: AdminWorkingHour[]; blockedTimes: AdminBlockedTime[]; refresh: () => Promise<void> }) {
  const [hourForm, setHourForm] = useState({ day_of_week: "1", starts_at: "09:00", ends_at: "17:00", is_enabled: true });
  const [editingHour, setEditingHour] = useState("");
  const [blockedForm, setBlockedForm] = useState({ starts_at: "", ends_at: "", reason: "" });
  const [editingBlocked, setEditingBlocked] = useState("");
  const [error, setError] = useState("");
  async function saveHour(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const payload = { day_of_week: Number(hourForm.day_of_week), starts_at: hourForm.starts_at, ends_at: hourForm.ends_at, is_enabled: hourForm.is_enabled }; if (editingHour) await updateAdminRecord("working_hours", editingHour, payload); else await createAdminRecord("working_hours", payload); setEditingHour(""); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Working hours could not be saved"); } }
  async function saveBlocked(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const payload = { starts_at: new Date(blockedForm.starts_at).toISOString(), ends_at: new Date(blockedForm.ends_at).toISOString(), reason: blockedForm.reason }; if (editingBlocked) await updateAdminRecord("blocked_times", editingBlocked, payload); else await createAdminRecord("blocked_times", payload); setEditingBlocked(""); setBlockedForm({ starts_at: "", ends_at: "", reason: "" }); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Blocked time could not be saved"); } }
  return <section><p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">Schedule</p><h2 className="mt-3 text-4xl">Availability</h2><div className="mt-8 grid gap-8 lg:grid-cols-2"><div><h3 className="font-heading text-2xl">Working hours</h3><form onSubmit={saveHour} className="mt-4 grid gap-3 rounded-[1.5rem] bg-surface p-5"><div className="grid grid-cols-3 gap-2"><select value={hourForm.day_of_week} onChange={(event) => setHourForm({ ...hourForm, day_of_week: event.target.value })} className="h-10 rounded-xl border border-line bg-background px-2 text-xs">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input type="time" value={hourForm.starts_at} onChange={(event) => setHourForm({ ...hourForm, starts_at: event.target.value })} required className="h-10 rounded-xl border border-line bg-background px-2 text-xs" /><input type="time" value={hourForm.ends_at} onChange={(event) => setHourForm({ ...hourForm, ends_at: event.target.value })} required className="h-10 rounded-xl border border-line bg-background px-2 text-xs" /></div><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={hourForm.is_enabled} onChange={(event) => setHourForm({ ...hourForm, is_enabled: event.target.checked })} /> Enabled</label><button className="h-10 rounded-full bg-foreground text-xs font-semibold text-white">{editingHour ? "Save hours" : "Add hours"}</button></form><div className="mt-4 space-y-2">{workingHours.map((hour) => <div key={hour.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"><span>{dayNames[hour.day_of_week]} · {inputTime(hour.starts_at)}–{inputTime(hour.ends_at)}<small className="block text-xs text-foreground/55">{hour.is_enabled ? "Enabled" : "Disabled"}</small></span><span className="flex gap-2"><button type="button" onClick={() => { setEditingHour(hour.id); setHourForm({ day_of_week: String(hour.day_of_week), starts_at: inputTime(hour.starts_at), ends_at: inputTime(hour.ends_at), is_enabled: hour.is_enabled }); }} className="text-xs font-semibold underline decoration-brand underline-offset-4">Edit</button><button type="button" onClick={async () => { await deleteAdminRecord("working_hours", hour.id); await refresh(); }} className="text-xs font-semibold text-brand-deep">Delete</button></span></div>)}</div></div><div><h3 className="font-heading text-2xl">Blocked times</h3><form onSubmit={saveBlocked} className="mt-4 grid gap-3 rounded-[1.5rem] bg-surface p-5"><input type="datetime-local" value={blockedForm.starts_at} onChange={(event) => setBlockedForm({ ...blockedForm, starts_at: event.target.value })} required className="h-10 rounded-xl border border-line bg-background px-3 text-xs" /><input type="datetime-local" value={blockedForm.ends_at} onChange={(event) => setBlockedForm({ ...blockedForm, ends_at: event.target.value })} required className="h-10 rounded-xl border border-line bg-background px-3 text-xs" /><input value={blockedForm.reason} onChange={(event) => setBlockedForm({ ...blockedForm, reason: event.target.value })} placeholder="Reason" className="h-10 rounded-xl border border-line bg-background px-3 text-xs" /><button className="h-10 rounded-full bg-foreground text-xs font-semibold text-white">{editingBlocked ? "Save blocked time" : "Block time"}</button></form><div className="mt-4 space-y-2">{blockedTimes.map((blocked) => <div key={blocked.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"><span>{formatLondonDate(blocked.starts_at)} · {formatLondonTime(blocked.starts_at)}–{formatLondonTime(blocked.ends_at)}<small className="block text-xs text-foreground/55">{blocked.reason}</small></span><span className="flex gap-2"><button type="button" onClick={() => { setEditingBlocked(blocked.id); setBlockedForm({ starts_at: localDateTime(blocked.starts_at), ends_at: localDateTime(blocked.ends_at), reason: blocked.reason ?? "" }); }} className="text-xs font-semibold underline decoration-brand underline-offset-4">Edit</button><button type="button" onClick={async () => { await deleteAdminRecord("blocked_times", blocked.id); await refresh(); }} className="text-xs font-semibold text-brand-deep">Unblock</button></span></div>)}</div></div></div><PanelMessage error={error} message="" /></section>;
}

function CustomersPanel({ customers, refresh }: { customers: AdminCustomer[]; refresh: () => Promise<void> }) {
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { if (editingId) await updateAdminRecord("customers", editingId, form); else await createAdminRecord("customers", form); setEditingId(""); setForm({ full_name: "", email: "", phone: "" }); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Customer could not be saved"); } }
  return <section><p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">People</p><h2 className="mt-3 text-4xl">Customers</h2><div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={save} className="h-fit grid gap-3 rounded-[1.5rem] bg-surface p-6"><h3 className="font-heading text-2xl">{editingId ? "Edit customer" : "Add customer"}</h3><input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Full name" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" required className="h-11 rounded-xl border border-line bg-background px-3 text-sm" /><button className="h-11 rounded-full bg-foreground text-sm font-semibold text-white">{editingId ? "Save customer" : "Add customer"}</button></form><div className="space-y-3">{customers.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5"><div><p className="font-semibold">{customer.full_name}</p><p className="mt-1 text-xs text-foreground/60">{customer.email} · {customer.phone}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingId(customer.id); setForm({ full_name: customer.full_name, email: customer.email, phone: customer.phone }); }} className="rounded-full border border-line px-3 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={async () => { if (window.confirm("Anonymise this customer?")) { await deleteAdminRecord("customers", customer.id); await refresh(); } }} className="rounded-full px-3 py-2 text-xs font-semibold text-brand-deep">Anonymise</button></div></div>)}</div></div><PanelMessage error={error} message="" /></section>;
}

function ContentPanel({ profile, settings, gallery, refresh }: { profile: AdminProfile | null; settings: AdminSettings | null; gallery: AdminGalleryItem[]; refresh: () => Promise<void> }) {
  const [profileForm, setProfileForm] = useState(profile ?? { id: true, business_name: "", beautician_name: "", tagline: "", about_heading: "", about_body: "", contact_email: "", contact_phone: "", location: "", instagram_url: "", whatsapp_number: "" });
  const [settingsForm, setSettingsForm] = useState(settings ?? { id: true, timezone: "Europe/London", slot_interval_minutes: 15, cancellation_notice_hours: 24, minimum_booking_notice_minutes: 0 });
  const [galleryForm, setGalleryForm] = useState({ slug: "", image_url: "", alt_text: "", caption: "", display_order: "0", published: true });
  const [editingGallery, setEditingGallery] = useState("");
  const [error, setError] = useState("");
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { await updateAdminRecord("business_profile", null, profileForm); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Profile could not be saved"); } }
  async function saveSettings(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { await updateAdminRecord("business_settings", null, { ...settingsForm, slot_interval_minutes: Number(settingsForm.slot_interval_minutes), cancellation_notice_hours: Number(settingsForm.cancellation_notice_hours), minimum_booking_notice_minutes: Number(settingsForm.minimum_booking_notice_minutes) }); await refresh(); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Settings could not be saved"); } }
  async function saveGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const file = (event.currentTarget.elements.namedItem("image_file") as HTMLInputElement | null)?.files?.[0];
      let imageUrl = galleryForm.image_url;
      let storagePath: string | undefined;
      if (file) {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        storagePath = `gallery/${crypto.randomUUID()}-${safeName}`;
        const storage = createSupabaseBrowserClient().storage.from("gallery");
        const upload = await storage.upload(storagePath, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        imageUrl = storage.getPublicUrl(storagePath).data.publicUrl;
      }
      if (!imageUrl) throw new Error("Add an image URL or upload an image");
      const payload = { ...galleryForm, image_url: imageUrl, ...(storagePath ? { storage_path: storagePath } : {}), display_order: Number(galleryForm.display_order) };
      if (editingGallery) await updateAdminRecord("gallery_items", editingGallery, payload);
      else await createAdminRecord("gallery_items", payload);
      setEditingGallery("");
      setGalleryForm({ slug: "", image_url: "", alt_text: "", caption: "", display_order: "0", published: true });
      await refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Gallery item could not be saved");
    }
  }
  return <section><p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">Brand and site</p><h2 className="mt-3 text-4xl">Content</h2><div className="mt-8 grid gap-6 lg:grid-cols-2"><form onSubmit={saveProfile} className="grid gap-3 rounded-[1.5rem] bg-surface p-6"><h3 className="font-heading text-2xl">Business profile</h3>{(["business_name", "beautician_name", "tagline", "contact_email", "contact_phone", "location"] as const).map((field) => <input key={field} value={profileForm[field] ?? ""} onChange={(event) => setProfileForm({ ...profileForm, [field]: event.target.value })} placeholder={field.replaceAll("_", " ")} className="h-10 rounded-xl border border-line bg-background px-3 text-sm" />)}<textarea value={profileForm.about_body ?? ""} onChange={(event) => setProfileForm({ ...profileForm, about_body: event.target.value })} placeholder="About body" rows={4} className="rounded-xl border border-line bg-background px-3 py-3 text-sm" /><button className="h-10 rounded-full bg-foreground text-xs font-semibold text-white">Save profile</button></form><form onSubmit={saveSettings} className="grid h-fit gap-3 rounded-[1.5rem] bg-surface p-6"><h3 className="font-heading text-2xl">Booking settings</h3><input value={settingsForm.timezone} onChange={(event) => setSettingsForm({ ...settingsForm, timezone: event.target.value })} placeholder="Timezone" className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input type="number" value={settingsForm.slot_interval_minutes} onChange={(event) => setSettingsForm({ ...settingsForm, slot_interval_minutes: Number(event.target.value) })} placeholder="Slot interval minutes" className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input type="number" value={settingsForm.cancellation_notice_hours} onChange={(event) => setSettingsForm({ ...settingsForm, cancellation_notice_hours: Number(event.target.value) })} placeholder="Cancellation notice hours" className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input type="number" value={settingsForm.minimum_booking_notice_minutes} onChange={(event) => setSettingsForm({ ...settingsForm, minimum_booking_notice_minutes: Number(event.target.value) })} placeholder="Minimum booking notice" className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><button className="h-10 rounded-full bg-foreground text-xs font-semibold text-white">Save settings</button></form></div><div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={saveGallery} className="grid h-fit gap-3 rounded-[1.5rem] bg-surface p-6"><h3 className="font-heading text-2xl">Gallery item</h3><input value={galleryForm.slug} onChange={(event) => setGalleryForm({ ...galleryForm, slug: event.target.value })} placeholder="Slug" required className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input value={galleryForm.image_url} onChange={(event) => setGalleryForm({ ...galleryForm, image_url: event.target.value })} placeholder="Image URL" required className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input value={galleryForm.alt_text} onChange={(event) => setGalleryForm({ ...galleryForm, alt_text: event.target.value })} placeholder="Alt text" required className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><input value={galleryForm.caption} onChange={(event) => setGalleryForm({ ...galleryForm, caption: event.target.value })} placeholder="Caption" className="h-10 rounded-xl border border-line bg-background px-3 text-sm" /><button className="h-10 rounded-full bg-foreground text-xs font-semibold text-white">{editingGallery ? "Save gallery item" : "Add gallery item"}</button></form><div className="space-y-3">{gallery.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5"><div><p className="font-semibold">{item.caption || item.slug}</p><p className="mt-1 text-xs text-foreground/60">{item.published ? "Published" : "Hidden"}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingGallery(item.id); setGalleryForm({ slug: item.slug, image_url: item.image_url ?? "", alt_text: item.alt_text, caption: item.caption ?? "", display_order: String(item.display_order), published: item.published }); }} className="rounded-full border border-line px-3 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={async () => { await deleteAdminRecord("gallery_items", item.id); await refresh(); }} className="rounded-full px-3 py-2 text-xs font-semibold text-brand-deep">Delete</button></div></div>)}</div></div><PanelMessage error={error} message="" /></section>;
}
