import Link from "next/link";

import { CtaPanel, GalleryTile, TreatmentCard } from "@/components/marketing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicGallery, getPublicProfile, getPublicTreatments } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [profile, treatments, gallery] = await Promise.all([
    getPublicProfile(),
    getPublicTreatments(),
    getPublicGallery(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-surface lg:block" />
          <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-12 lg:py-36">
            <div className="max-w-2xl">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">
                {profile.tagline}
              </p>
              <h1 className="max-w-xl text-5xl leading-[1.04] sm:text-7xl">
                Your time to feel beautifully looked after.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-8 text-foreground/75 sm:text-lg">
                A calm, considered approach to beauty treatments, shaped around you and the way you want to feel when you leave.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/book"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
                >
                  Book an appointment
                </Link>
                <Link
                  href="/treatments"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-7 text-sm font-semibold transition-colors hover:border-brand hover:bg-surface"
                >
                  Explore treatments
                </Link>
              </div>
            </div>

            <GalleryTile item={gallery[0]} className="min-h-[25rem] sm:min-h-[31rem]" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24 lg:px-12">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">The treatment edit</p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">Small rituals. Considered results.</h2>
            </div>
            <Link href="/treatments" className="text-sm font-semibold underline decoration-brand underline-offset-4">
              View all treatments
            </Link>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {treatments.slice(0, 3).map((treatment, index) => (
              <TreatmentCard key={treatment.id} treatment={treatment} index={index} />
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">The Sculpted approach</p>
              <h2 className="mt-4 max-w-sm text-4xl leading-tight sm:text-5xl">Beauty that still feels like you.</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                ["01", "Personal", "A treatment plan shaped around your features, preferences, and pace."],
                ["02", "Considered", "A calm appointment where the details matter and you can exhale."],
                ["03", "Yours", "Modern beauty with results that feel polished, natural, and unmistakably you."],
              ].map(([number, title, copy]) => (
                <div key={number} className="border-t border-line pt-5">
                  <span className="text-xs font-semibold tracking-[0.2em] text-brand-deep">{number}</span>
                  <h3 className="mt-8 text-2xl">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-foreground/70">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24 lg:px-12">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">A glimpse inside</p>
              <h2 className="mt-4 text-4xl sm:text-5xl">The little details.</h2>
            </div>
            <Link href="/gallery" className="hidden text-sm font-semibold underline decoration-brand underline-offset-4 sm:block">
              Visit the gallery
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {gallery.slice(0, 3).map((item, index) => (
              <GalleryTile key={item.id} item={item} className={index === 1 ? "sm:mt-12" : ""} />
            ))}
          </div>
        </section>

        <CtaPanel title={`${profile.beautician_name} is ready when you are.`} />
      </main>
      <SiteFooter />
    </div>
  );
}
