import { CtaPanel, PageIntro, TreatmentCard } from "@/components/marketing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicTreatments } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function TreatmentsPage() {
  const treatments = await getPublicTreatments();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageIntro
          eyebrow="The treatment menu"
          title="A considered edit of modern beauty."
          description="Every treatment is designed to feel personal, unhurried, and quietly transformative. Browse the menu, then choose a time that belongs to you."
        />
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24 lg:px-12">
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {treatments.map((treatment, index) => (
              <TreatmentCard key={treatment.id} treatment={treatment} index={index} />
            ))}
          </div>
        </section>
        <CtaPanel eyebrow="Find your time" title="Your appointment starts here." />
      </main>
      <SiteFooter />
    </div>
  );
}
