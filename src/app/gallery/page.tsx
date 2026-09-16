import { CtaPanel, GalleryTile, PageIntro } from "@/components/marketing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicGallery } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const gallery = await getPublicGallery();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageIntro
          eyebrow="The gallery"
          title="A feeling, in details."
          description="A glimpse into the textures, tones, and quiet rituals behind each appointment."
        />
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24 lg:px-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item, index) => (
              <GalleryTile key={item.id} item={item} className={index % 3 === 1 ? "sm:mt-14" : ""} />
            ))}
          </div>
        </section>
        <CtaPanel eyebrow="Make room for your ritual" title="Your time, beautifully arranged." />
      </main>
      <SiteFooter />
    </div>
  );
}
