import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-12">
        <div>
          <p className="font-heading text-2xl">{siteConfig.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-foreground/70">
            Beauty treatments with a softer, more considered touch.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-foreground/70 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link href="/book" className="transition-colors hover:text-foreground">
            Book appointment
          </Link>
          <span>{siteConfig.timezone}</span>
        </div>
      </div>
    </footer>
  );
}
