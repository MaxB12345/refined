"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  cancelCustomerAppointment,
  getCustomerAppointments,
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerAppointment,
  type CustomerProfile,
} from "@/lib/customer-api";
import { formatLondonDate, formatLondonTime, formatPrice } from "@/lib/date-format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppointmentListSkeleton } from "@/components/ui/loading";

function isUpcoming(appointment: CustomerAppointment) {
  return appointment.status === "confirmed" && new Date(appointment.starts_at).getTime() > Date.now();
}

function statusLabel(status: CustomerAppointment["status"]) {
  return status === "no_show" ? "No show" : status.replace("_", " ");
}

export function CustomerPortal() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [view, setView] = useState<"upcoming" | "previous">("upcoming");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPortal() {
    try {
      const [appointmentData, profileData] = await Promise.all([
        getCustomerAppointments(),
        getCustomerProfile(),
      ]);
      setAppointments(appointmentData);
      setProfile(profileData);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Your account could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  const loadPortalForEffect = useEffectEvent(loadPortal);

  useEffect(() => {
    const task = window.setTimeout(() => void loadPortalForEffect(), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function cancel(appointment: CustomerAppointment) {
    if (!window.confirm("Cancel this appointment?")) return;
    setActionId(appointment.id);
    setError("");
    setMessage("");
    try {
      await cancelCustomerAppointment(appointment.id);
      await loadPortal();
      setMessage("Your appointment has been cancelled.");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The appointment could not be cancelled");
    } finally {
      setActionId("");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    try {
      const updated = await updateCustomerProfile(
        String(formData.get("full_name") ?? ""),
        String(formData.get("phone") ?? ""),
      );
      setProfile(updated);
      setMessage("Your details have been updated.");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Your details could not be updated");
    } finally {
      setProfileSaving(false);
    }
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const visibleAppointments = appointments.filter((appointment) => view === "upcoming" ? isUpcoming(appointment) : !isUpcoming(appointment));

  if (loading) {
    return <AppointmentListSkeleton />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Your appointments</p>
            <h1 className="mt-4 text-5xl leading-tight">Your time, kept.</h1>
          </div>
          <div className="flex rounded-full border border-line p-1 text-xs font-semibold">
            {(["upcoming", "previous"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setView(tab)} className={`rounded-full px-4 py-2 capitalize ${view === tab ? "bg-foreground text-white" : "text-foreground/65"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {!visibleAppointments.length && (
            <div className="rounded-[1.5rem] border border-line bg-surface p-7">
              <h2 className="font-heading text-3xl">Nothing here yet.</h2>
              <p className="mt-3 text-sm leading-7 text-foreground/65">Make a little room for yourself and choose your next treatment.</p>
              <Link href="/book" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-white hover:bg-brand-deep">Book an appointment</Link>
            </div>
          )}
          {visibleAppointments.map((appointment) => (
            <article key={appointment.id} className="rounded-[1.5rem] border border-line bg-white p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-heading text-3xl">{appointment.treatment_name}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${appointment.status === "confirmed" ? "bg-surface text-brand-deep" : "border border-line text-foreground/55"}`}>{statusLabel(appointment.status)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{formatLondonDate(appointment.starts_at)}</p>
                  <p className="mt-1 text-sm text-foreground/65">{formatLondonTime(appointment.starts_at)} · {appointment.duration_minutes} minutes · {formatPrice(appointment.price_pence)}</p>
                </div>
                <Link href={`/account/appointments/${appointment.id}`} className="text-sm font-semibold underline decoration-brand underline-offset-4">View details</Link>
              </div>
              {isUpcoming(appointment) && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
                  <Link href={`/account/appointments/${appointment.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface">Reschedule</Link>
                  <button type="button" onClick={() => cancel(appointment)} disabled={actionId === appointment.id} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-brand-deep hover:bg-surface disabled:opacity-50">{actionId === appointment.id ? "Cancelling..." : "Cancel appointment"}</button>
                </div>
              )}
            </article>
          ))}
        </div>

        {message && <p role="status" className="mt-5 text-sm text-brand-deep">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm">{error}</p>}
      </section>

      <aside className="h-fit rounded-[1.5rem] bg-surface p-6 sm:p-7 lg:sticky lg:top-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Your details</p>
            <p className="mt-2 text-xs text-foreground/55">Used for appointment updates.</p>
          </div>
          <button type="button" onClick={signOut} className="text-xs font-semibold underline decoration-brand underline-offset-4">Sign out</button>
        </div>
        {profile ? (
          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold" htmlFor="account-name">Full name<input id="account-name" name="full_name" defaultValue={profile.full_name} required className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-brand" /></label>
            <div className="text-sm font-semibold">Email address<p className="mt-2 rounded-xl border border-line bg-background px-3 py-3 text-sm font-normal text-foreground/65">{profile.email}</p></div>
            <label className="block text-sm font-semibold" htmlFor="account-phone">Phone number<input id="account-phone" name="phone" defaultValue={profile.phone} required className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-brand" /></label>
            <button type="submit" disabled={profileSaving} className="min-h-11 w-full rounded-full bg-foreground px-4 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50">{profileSaving ? "Saving..." : "Save details"}</button>
          </form>
        ) : (
          <p className="mt-6 text-sm leading-6 text-foreground/65">Your profile will appear after your first booking.</p>
        )}
      </aside>
    </div>
  );
}
