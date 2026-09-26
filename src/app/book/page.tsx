import { BookingWizard } from "@/components/booking-wizard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getTurnstileSiteKey } from "@/lib/env";
import { getPublicTreatments } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const treatments = await getPublicTreatments();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 sm:px-10 sm:pb-16 sm:pt-24 lg:px-12">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">Book an appointment</p>
            <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Find a little time for yourself.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/70">Choose your treatment, select a time that works, and confirm your appointment in a few simple steps.</p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-16 lg:px-12">
          <BookingWizard treatments={treatments} turnstileSiteKey={getTurnstileSiteKey()} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
