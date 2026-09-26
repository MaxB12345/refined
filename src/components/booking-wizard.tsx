"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AvailabilityPicker } from "@/components/availability-picker";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { createBooking, type AvailabilitySlot } from "@/lib/booking-api";
import { londonTimeInput } from "@/lib/date-format";
import type { PublicTreatment } from "@/lib/public-content";
import { Spinner } from "@/components/ui/loading";

type BookingWizardProps = {
  treatments: PublicTreatment[];
  turnstileSiteKey: string;
};

function londonTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPrice(pricePence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(pricePence / 100);
}

export function BookingWizard({ treatments, turnstileSiteKey }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [treatmentId, setTreatmentId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  // Bumped to reload availability from scratch, e.g. after someone else takes the chosen time.
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Tokens are single-use, so a failed submit remounts the widget to issue a fresh one.
  const [turnstileVersion, setTurnstileVersion] = useState(0);
  const wizardTop = useRef<HTMLDivElement>(null);

  const selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId);

  useEffect(() => {
    // On narrow screens the step controls sit far below the next step's heading.
    const top = wizardTop.current;
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  function chooseTreatment(id: string) {
    if (id !== treatmentId) {
      setSelectedDate("");
      setSelectedSlot(null);
    }
    setTreatmentId(id);
    setError("");
  }

  function chooseTime(date: string, slot: AvailabilitySlot | null) {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setError("");
  }

  function continueToDate() {
    if (!treatmentId) return setError("Choose a treatment to continue.");
    setError("");
    setStep(2);
  }

  function continueToDetails() {
    if (!selectedDate || !selectedSlot) return setError("Choose one of the available times to continue.");
    setError("");
    setStep(3);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTreatment || !selectedSlot || !turnstileToken) return;

    setSubmitting(true);
    setError("");

    try {
      const appointment = await createBooking({
        treatmentId: selectedTreatment.id,
        date: selectedDate,
        startTime: londonTimeInput(selectedSlot.starts_at),
        customerName,
        customerEmail,
        customerPhone,
        turnstileToken,
      });
      router.push(`/booking/confirmation/${appointment.confirmation_token}`);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : "The appointment could not be booked";
      setSubmitting(false);
      setTurnstileToken(null);
      setTurnstileVersion((version) => version + 1);
      if (/no longer available|not available/i.test(message)) {
        // Someone else got there first: show fresh times, keep the day and their details.
        setSelectedSlot(null);
        setAvailabilityVersion((version) => version + 1);
        setStep(2);
        setError("Sorry, that time was just booked by someone else. Please choose another time below.");
        return;
      }
      setError(message);
    }
  }

  return (
    <div ref={wizardTop} className="grid scroll-mt-6 gap-8 lg:grid-cols-[1fr_18rem]">
      <section className="rounded-[2rem] border border-line bg-white p-6 sm:p-9">
        <div className="mb-9 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
          {["Treatment", "Date & time", "Your details"].map((label, index) => (
            <div key={label} className={`flex items-center gap-2 ${index < 2 ? "flex-1" : ""}`}>
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
                  <div className="flex items-baseline justify-between gap-4">
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
              See available times
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Step two</p>
            <h2 className="mt-3 text-4xl">Find your time.</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">Days with free times are highlighted. Pick a day, then a time that suits you.</p>
            <div className="mt-6">
              <AvailabilityPicker key={`${treatmentId}-${availabilityVersion}`} treatmentId={treatmentId} selectedDate={selectedDate} selectedSlot={selectedSlot} onSelect={chooseTime} />
            </div>
            {/* Pinned on phones so the next step stays in reach below a long list of times. */}
            <div className="sticky bottom-0 z-10 -mx-6 mt-8 flex gap-3 border-t border-line bg-white/95 px-6 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <button type="button" onClick={() => setStep(1)} className="min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-surface">Back</button>
              <button type="button" onClick={continueToDetails} disabled={!selectedSlot} className="min-h-12 flex-1 rounded-full sm:flex-none bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40">{selectedSlot ? `Continue with ${londonTime(selectedSlot.starts_at)}` : "Choose a time to continue"}</button>
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
            <div className="mt-8">
              <TurnstileWidget key={turnstileVersion} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep(2)} className="min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-surface">Back</button>
              <button type="submit" disabled={submitting || !turnstileToken} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60">
                {submitting && <Spinner />}
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
          {selectedDate && <p className="mt-5 border-t border-line pt-5 text-sm font-semibold">{formatDate(selectedDate)}</p>}
          {selectedSlot && <p className="mt-2 text-sm text-foreground/65">{londonTime(selectedSlot.starts_at)} in the UK</p>}
        </div>
        <p className="mt-8 text-xs leading-5 text-foreground/55">Your time is held only once the appointment has been confirmed.</p>
      </aside>
    </div>
  );
}
