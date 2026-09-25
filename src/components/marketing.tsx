import Link from "next/link";

import type { PublicGalleryItem, PublicTreatment } from "@/lib/public-content";

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-14 pt-16 sm:px-10 sm:pb-20 sm:pt-24 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">{eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">{title}</h1>
        </div>
        <div className="max-w-md lg:justify-self-end">
          <p className="text-base leading-8 text-foreground/70">{description}</p>
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3 text-sm font-semibold">
      <span>{children}</span>
      <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">-&gt;</span>
    </Link>
  );
}

export function TreatmentCard({ treatment, index }: { treatment: PublicTreatment; index: number }) {
  const price = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(treatment.price_pence / 100);

  return (
    <article className="flex h-full flex-col border-t border-line py-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold tracking-[0.2em] text-brand-deep">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold text-foreground/70">
          {treatment.duration_minutes} mins
        </span>
      </div>
      <h2 className="mt-6 text-3xl leading-tight sm:text-4xl">{treatment.name}</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-foreground/65">{treatment.description}</p>
      <p className="mt-auto pt-6 text-sm font-semibold">From {price}</p>
    </article>
  );
}

export function GalleryTile({ item, className = "" }: { item: PublicGalleryItem; className?: string }) {
  return (
    <figure
      className={`group relative min-h-80 overflow-hidden rounded-[1.5rem] bg-surface-strong bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url("${item.imageUrl}")` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent opacity-80" />
      <figcaption className="absolute bottom-5 left-5 right-5 text-sm font-semibold text-white">
        <span className="block translate-y-1 transition-transform group-hover:translate-y-0">{item.caption}</span>
        <span className="mt-1 block text-xs font-normal text-white/75">{item.altText}</span>
      </figcaption>
    </figure>
  );
}

export function CtaPanel({
  eyebrow = "Your time, thoughtfully kept",
  title = "Ready when you are.",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24 lg:px-12">
      <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-7 py-12 text-white sm:px-12 sm:py-16">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/15" />
        <div className="absolute bottom-8 right-20 hidden h-20 w-20 rounded-full bg-brand/30 sm:block" />
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">{eyebrow}</p>
          <h2 className="mt-5 text-4xl leading-tight sm:text-6xl">{title}</h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
            Choose a treatment, find a time that suits you, and make a little room for yourself.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:bg-brand"
          >
            Book an appointment
          </Link>
        </div>
      </div>
    </section>
  );
}
