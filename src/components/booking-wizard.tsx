"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createBooking, fetchAvailability, type AvailabilitySlot } from "@/lib/booking-api";
import type { PublicTreatment } from "@/lib/public-content";

type BookingWizardProps = {
  treatments: PublicTreatment[];
};

function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function londonTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatPrice(pricePence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(pricePence / 100);
}

export function BookingWizard({ treatments }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [treatmentId, setTreatmentId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const availabilityRequest = useRef<AbortController | null>(null);

  const selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId);
  const minimumDate = londonToday();

  useEffect(() => () => availabilityRequest.current?.abort(), []);

  function loadSlots(id: string, date: string) {
    availabilityRequest.current?.abort();
    if (!id || !date) {
      setLoadingSlots(false);
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    availabilityRequest.current = controller;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    setError("");

    fetchAvailability(id, date)
      .then((response) => {
        if (!controller.signal.aborted) setSlots(response.slots);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setSlots([]);
          setError(requestError instanceof Error ? requestError.message : "Availability could not be loaded");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
  }

  function chooseTreatment(id: string) {
    setTreatmentId(id);
    setSelectedSlot(null);
    setError("");
    loadSlots(id, selectedDate);
  }

  function chooseDate(value: string) {
    setSelectedDate(value);
    setSelectedSlot(null);
    setError("");
    loadSlots(treatmentId, value);
  }

  function continueToDate() {
    if (!treatmentId) return setError("Choose a treatment to continue.");
    setError("");
    setStep(2);
  }

  function continueToDetails() {
    if (!selectedDate || !selectedSlot) return setError("Choose a date and available time to continue.");
    setError("");
    setStep(3);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTreatment || !selectedSlot) return;

    setSubmitting(true);
    setError("");

    try {
      const appointment = await createBooking({
        treatmentId: selectedTreatment.id,
        date: selectedDate,
        startTime: londonTime(selectedSlot.starts_at),
        customerName,
        customerEmail,
        customerPhone,
      });
      router.push(`/booking/confirmation/${appointment.confirmation_token}`);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The appointment could not be booked");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <section className="rounded-[2rem] border border-line bg-white p-6 sm:p-9">
        <div className="mb-9 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
          {["Treatment", "Date & time", "Your details"].map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] ${step >= index + 1 ? "bg-foreground text-white" : "bg-surface text-foreground/50"}`}>
                {index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {index < 2 && <span className="h-px flex-1 bg-line" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Step one</p>
            <h2 className="mt-3 text-4xl">Choose your treatment.</h2>
            <div className="mt-8 grid gap-3">
              {treatments.map((treatment) => (
                <button
                  key={treatment.id}
                  type="button"
                  onClick={() => chooseTreatment(treatment.id)}
                  className={`rounded-2xl border p-5 text-left transition-colors ${treatmentId === treatment.id ? "border-foreground bg-surface" : "border-line hover:border-brand"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-heading text-2xl">{treatment.name}</span>
                    <span className="shrink-0 text-sm font-semibold">{formatPrice(treatment.price_pence)}</span>
                  </div>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-foreground/65">{treatment.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">{treatment.duration_minutes} minutes</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={continueToDate}
              className="mt-8 min-h-12 w-full rounded-full bg-foreground px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-deep sm:w-auto"
            >
              Choose a date
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Step two</p>
            <h2 className="mt-3 text-4xl">Find your time.</h2>
            <label className="mt-8 block max-w-xs text-sm font-semibold" htmlFor="appointment-date">
              Appointment date
              <input
                id="appointment-date"
                type="date"
                min={minimumDate}
                value={selectedDate}
                onChange={(event) => chooseDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand"
              />
            </label>
            <div className="mt-8">
              <p className="text-sm font-semibold">Available times</p>
              {!selectedDate && <p className="mt-3 text-sm text-foreground/60">Choose a date to see available times.</p>}
              {selectedDate && loadingSlots && <p className="mt-3 text-sm text-foreground/60">Checking availability...</p>}
              {selectedDate && !loadingSlots && !slots.length && <p className="mt-3 text-sm text-foreground/60">There are no available times on this date. Try another day.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    key={slot.starts_at}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${selectedSlot?.starts_at === slot.starts_at ? "border-foreground bg-foreground text-white" : "border-line hover:border-brand"}`}
                  >
                    {londonTime(slot.starts_at)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep(1)} className="min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-surface">Back</button>
              <button type="button" onClick={continueToDetails} className="min-h-12 rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep">Enter your details</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={submitBooking}>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Step three</p>
            <h2 className="mt-3 text-4xl">A few details, then you are done.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2" htmlFor="customer-name">
                Full name
                <input id="customer-name" type="text" autoComplete="name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand" />
              </label>
              <label className="text-sm font-semibold" htmlFor="customer-email">
                Email address
                <input id="customer-email" type="email" autoComplete="email" required value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand" />
              </label>
              <label className="text-sm font-semibold" htmlFor="customer-phone">
                Phone number
                <input id="customer-phone" type="tel" autoComplete="tel" required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand" />
              </label>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep(2)} className="min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-surface">Back</button>
              <button type="submit" disabled={submitting} className="min-h-12 rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Confirming appointment..." : "Confirm appointment"}
              </button>
            </div>
          </form>
        )}

        {error && <p role="alert" className="mt-6 rounded-xl bg-surface px-4 py-3 text-sm text-foreground">{error}</p>}
      </section>

      <aside className="h-fit rounded-[2rem] bg-surface p-6 sm:p-8 lg:sticky lg:top-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-deep">Your appointment</p>
        <div className="mt-6 border-t border-line pt-5">
          <p className="font-heading text-2xl">{selectedTreatment?.name ?? "Choose a treatment"}</p>
          {selectedTreatment && <p className="mt-2 text-sm text-foreground/65">{selectedTreatment.duration_minutes} minutes · {formatPrice(selectedTreatment.price_pence)}</p>}
          {selectedDate && <p className="mt-5 border-t border-line pt-5 text-sm font-semibold">{selectedDate}</p>}
          {selectedSlot && <p className="mt-2 text-sm text-foreground/65">{londonTime(selectedSlot.starts_at)} in the UK</p>}
        </div>
        <p className="mt-8 text-xs leading-5 text-foreground/55">Your time is held only once the appointment has been confirmed.</p>
      </aside>
    </div>
  );
}
