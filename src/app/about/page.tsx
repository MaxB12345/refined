import { CtaPanel, PageIntro } from "@/components/marketing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicProfile } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const profile = await getPublicProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageIntro
          eyebrow="About Sculpted by Ruby"
          title={profile.about_heading}
          description={profile.about_body}
        />
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
          <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] bg-surface-strong">
            <div className="absolute inset-6 rounded-[1.5rem] border border-white/70" />
            <div className="absolute bottom-8 left-8 max-w-xs sm:bottom-12 sm:left-12">
              <span className="mb-4 block h-px w-12 bg-brand-deep" />
              <p className="font-heading text-4xl leading-tight">A softer approach to looking after yourself.</p>
            </div>
            <div className="absolute right-10 top-10 h-28 w-28 rounded-full border border-white/70" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">Meet {profile.beautician_name}</p>
            <h2 className="mt-5 max-w-xl text-4xl leading-tight sm:text-5xl">Beauty should make space for you.</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-foreground/70">
              Sculpted by Ruby was created around a simple idea: the best beauty appointments are not rushed or one-size-fits-all. They are a chance to pause, be listened to, and leave feeling more like yourself.
            </p>
            <div className="mt-10 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
              <div>
                <p className="font-heading text-2xl">Attentive</p>
                <p className="mt-2 text-sm leading-6 text-foreground/65">Your features and preferences lead the way.</p>
              </div>
              <div>
                <p className="font-heading text-2xl">Unhurried</p>
                <p className="mt-2 text-sm leading-6 text-foreground/65">Time is part of the treatment, not an afterthought.</p>
              </div>
            </div>
          </div>
        </section>
        <CtaPanel eyebrow="A little time for yourself" title="Come as you are." />
      </main>
      <SiteFooter />
    </div>
  );
}
