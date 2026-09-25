"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchConfirmation, type BookingConfirmation } from "@/lib/booking-api";
import { ConfirmationSkeleton } from "@/components/ui/loading";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatTime(value: string) {
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

export function BookingConfirmation({ token }: { token: string }) {
  const [appointment, setAppointment] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConfirmation(token)
      .then(setAppointment)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Confirmation could not be loaded");
      });
  }, [token]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <section className="w-full max-w-xl rounded-[2rem] border border-line bg-surface p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Booking confirmation</p>
          <h1 className="mt-5 text-4xl">We could not find that appointment.</h1>
          <p className="mt-4 text-sm leading-7 text-foreground/70">The confirmation link may have expired or is not valid.</p>
          <Link href="/book" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep">Return to booking</Link>
        </section>
      </main>
    );
  }

  if (!appointment) {
    return <ConfirmationSkeleton />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-line bg-surface p-7 sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-2xl text-white" aria-hidden="true">✓</div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">Appointment confirmed</p>
        <h1 className="mt-5 max-w-xl text-5xl leading-tight sm:text-6xl">A little time, just for you.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-foreground/70">Your appointment is in the diary. We have sent your details to the email address you provided.</p>
        <div className="mt-10 grid gap-5 border-y border-line py-7 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Treatment</p>
            <p className="mt-2 font-heading text-2xl">{appointment.treatment_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Date</p>
            <p className="mt-2 text-sm font-semibold">{formatDate(appointment.starts_at)}</p>
            <p className="mt-1 text-sm text-foreground/65">{formatTime(appointment.starts_at)} · {appointment.duration_minutes} minutes</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Price</p>
            <p className="mt-2 text-sm font-semibold">{formatPrice(appointment.price_pence)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Confirmation</p>
            <p className="mt-2 text-sm font-semibold">#{appointment.public_token.slice(0, 8)}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/account/login" className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep">Manage appointments</Link>
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-sm font-semibold hover:bg-white">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
