import Link from "next/link";

import { getSessionSummary } from "@/lib/auth";
import { siteConfig } from "@/lib/site-config";

const navItems = [
  { label: "Treatments", href: "/treatments" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export async function SiteHeader() {
  const session = await getSessionSummary();
  const accountHref = session ? (session.isAdmin ? "/admin" : "/account") : "/account/login";
  const accountLabel = session ? (session.isAdmin ? "Admin" : "My account") : "Sign in";

  return (
    <header className="relative z-10 border-b border-line bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10 lg:px-12">
        <Link href="/" className="shrink-0" aria-label="Sculpted by Ruby home">
          <span className="block font-heading text-2xl leading-none">Sculpted</span>
          <span className="mt-1 block pl-5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-brand-deep">
            by Ruby
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={accountHref}
            className="hidden min-h-11 items-center rounded-full border border-line px-5 text-xs font-semibold text-foreground/75 transition-colors hover:text-foreground sm:inline-flex"
          >
            {accountLabel}
          </Link>
          <Link
            href="/book"
            className="hidden min-h-11 items-center rounded-full bg-foreground px-5 text-xs font-semibold text-white transition-colors hover:bg-brand-deep sm:inline-flex"
          >
            Book appointment
          </Link>
          <details className="relative lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-xs font-semibold">
              Menu
            </summary>
            <nav
              className="absolute right-0 top-14 flex w-48 flex-col gap-1 rounded-2xl border border-line bg-background p-2 shadow-xl"
              aria-label="Mobile navigation"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/book"
                className="mt-1 rounded-xl bg-foreground px-3 py-2.5 text-sm font-semibold text-white"
              >
                Book appointment
              </Link>
              <Link
                href={accountHref}
                className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:bg-surface"
              >
                {accountLabel}
              </Link>
            </nav>
          </details>
        </div>
      </div>
      <p className="sr-only">{siteConfig.description}</p>
    </header>
  );
}
