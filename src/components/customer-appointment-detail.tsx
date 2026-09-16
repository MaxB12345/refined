"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchAvailability, type AvailabilitySlot } from "@/lib/booking-api";
import {
  cancelCustomerAppointment,
  getCustomerAppointments,
  rescheduleCustomerAppointment,
  type CustomerAppointment,
} from "@/lib/customer-api";
import { formatLondonDate, formatLondonTime, formatPrice, londonDateInput, londonToday } from "@/lib/date-format";

function canChangeAppointment(appointment: CustomerAppointment) {
  return appointment.status === "confirmed" && new Date(appointment.starts_at).getTime() > Date.now();
}

export function CustomerAppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const availabilityRequest = useRef<AbortController | null>(null);
  const [appointment, setAppointment] = useState<CustomerAppointment | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAppointment() {
    try {
      const appointments = await getCustomerAppointments();
      const current = appointments.find((item) => item.id === appointmentId);
      if (!current) {
        setError("Appointment not found");
      } else {
        setAppointment(current);
        setSelectedDate(londonDateInput(current.starts_at));
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Appointment could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  const loadAppointmentForEffect = useEffectEvent(loadAppointment);

  useEffect(() => {
    const task = window.setTimeout(() => void loadAppointmentForEffect(), 0);
    return () => {
      window.clearTimeout(task);
      availabilityRequest.current?.abort();
    };
  }, [appointmentId]);

  function chooseDate(value: string) {
    setSelectedDate(value);
    setSelectedSlot(null);
    setSlots([]);
    setError("");
    if (!appointment || !value) return;

    availabilityRequest.current?.abort();
    const controller = new AbortController();
    availabilityRequest.current = controller;
    setLoadingSlots(true);
    fetchAvailability(appointment.treatment_id, value)
      .then((response) => {
        if (!controller.signal.aborted) setSlots(response.slots);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Availability could not be loaded");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
  }

  async function cancel() {
    if (!appointment || !window.confirm("Cancel this appointment?")) return;
    setBusy(true);
    setError("");
    try {
      await cancelCustomerAppointment(appointment.id);
      setMessage("Your appointment has been cancelled.");
      await loadAppointment();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The appointment could not be cancelled");
    } finally {
      setBusy(false);
    }
  }

  async function reschedule() {
    if (!appointment || !selectedSlot) {
      setError("Choose an available time to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await rescheduleCustomerAppointment(appointment.id, selectedDate, formatLondonTime(selectedSlot.starts_at));
      router.push("/account");
      router.refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The appointment could not be rescheduled");
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-sm text-foreground/65">Loading appointment...</main>;
  if (!appointment) return <main className="mx-auto min-h-screen max-w-3xl px-6 py-16"><p role="alert" className="rounded-2xl bg-surface px-5 py-4 text-sm">{error || "Appointment not found"}</p><Link href="/account" className="mt-6 inline-flex text-sm font-semibold underline decoration-brand underline-offset-4">Back to appointments</Link></main>;

  const canChange = canChangeAppointment(appointment);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 sm:px-10">
      <Link href="/account" className="text-sm font-semibold text-brand-deep underline decoration-brand underline-offset-4">Back to appointments</Link>
      <div className="mt-8 rounded-[2rem] border border-line bg-white p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Appointment details</p>
        <h1 className="mt-5 text-5xl leading-tight">{appointment.treatment_name}</h1>
        <div className="mt-8 grid gap-6 border-y border-line py-7 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Date</p><p className="mt-2 text-sm font-semibold">{formatLondonDate(appointment.starts_at)}</p><p className="mt-1 text-sm text-foreground/65">{formatLondonTime(appointment.starts_at)} · {appointment.duration_minutes} minutes</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Price</p><p className="mt-2 text-sm font-semibold">{formatPrice(appointment.price_pence)}</p><p className="mt-1 text-sm capitalize text-foreground/65">{appointment.status.replace("_", " ")}</p></div>
        </div>
        {canChange ? (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Reschedule</p>
            <h2 className="mt-3 font-heading text-3xl">Choose a new time.</h2>
            <label className="mt-6 block max-w-xs text-sm font-semibold" htmlFor="reschedule-date">New date<input id="reschedule-date" type="date" min={londonToday()} value={selectedDate} onChange={(event) => chooseDate(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand" /></label>
            {loadingSlots && <p className="mt-5 text-sm text-foreground/65">Checking availability...</p>}
            {!loadingSlots && selectedDate && !slots.length && <p className="mt-5 text-sm text-foreground/65">No alternative times are available on this date.</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => <button key={slot.starts_at} type="button" onClick={() => setSelectedSlot(slot)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${selectedSlot?.starts_at === slot.starts_at ? "border-foreground bg-foreground text-white" : "border-line hover:border-brand"}`}>{formatLondonTime(slot.starts_at)}</button>)}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={reschedule} disabled={busy} className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50">{busy ? "Saving..." : "Save new time"}</button>
              <button type="button" onClick={cancel} disabled={busy} className="min-h-11 rounded-full px-5 text-sm font-semibold text-brand-deep hover:bg-surface disabled:opacity-50">Cancel appointment</button>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm leading-7 text-foreground/65">This appointment can no longer be changed online. Please contact Sculpted by Ruby if you need help.</p>
        )}
        {message && <p role="status" className="mt-6 text-sm text-brand-deep">{message}</p>}
        {error && <p role="alert" className="mt-6 rounded-xl bg-surface px-4 py-3 text-sm">{error}</p>}
      </div>
    </main>
  );
}
