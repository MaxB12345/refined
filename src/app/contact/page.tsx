import Link from "next/link";

import { CtaPanel, PageIntro } from "@/components/marketing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicProfile } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const profile = await getPublicProfile();
  const isPlaceholderEmail = profile.contact_email.endsWith(".example");
  const hasPhone = !profile.contact_phone.toLowerCase().includes("coming soon");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageIntro
          eyebrow="Get in touch"
          title="A calm place to begin."
          description="Have a question about a treatment, or simply want to know if Sculpted by Ruby is right for you? Reach out, or go straight to booking."
        >
          <Link
            href="/book"
            className="inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Book an appointment
          </Link>
        </PageIntro>
        <section className="mx-auto grid max-w-7xl gap-5 px-6 py-16 sm:px-10 sm:py-24 md:grid-cols-3 lg:px-12">
          <div className="rounded-[1.5rem] bg-surface p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-deep">Email</p>
            {isPlaceholderEmail ? (
              <p className="mt-5 font-heading text-2xl">{profile.contact_email}</p>
            ) : (
              <a href={`mailto:${profile.contact_email}`} className="mt-5 block font-heading text-2xl underline decoration-brand underline-offset-4">
                {profile.contact_email}
              </a>
            )}
          </div>
          <div className="rounded-[1.5rem] bg-surface p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-deep">Phone</p>
            {hasPhone ? (
              <a href={`tel:${profile.contact_phone}`} className="mt-5 block font-heading text-2xl underline decoration-brand underline-offset-4">
                {profile.contact_phone}
              </a>
            ) : (
              <p className="mt-5 font-heading text-2xl">{profile.contact_phone}</p>
            )}
          </div>
          <div className="rounded-[1.5rem] bg-surface p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-deep">Based in</p>
            <p className="mt-5 font-heading text-2xl">{profile.location}</p>
          </div>
        </section>
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:px-12">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">Before your visit</p>
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <h2 className="text-2xl">Arrive as you are</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/65">There is no need to prepare perfectly. We will talk through what you want together.</p>
              </div>
              <div>
                <h2 className="text-2xl">Make some room</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/65">Appointments are deliberately unhurried, so leave a little space around your time.</p>
              </div>
              <div>
                <h2 className="text-2xl">Ask anything</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/65">Questions are always welcome before, during, or after your treatment.</p>
              </div>
            </div>
          </div>
        </section>
        <CtaPanel eyebrow="We would love to see you" title="Let's find your time." />
      </main>
      <SiteFooter />
    </div>
  );
}
