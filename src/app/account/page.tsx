import Link from "next/link";

import { CustomerPortal } from "@/components/customer-portal";
import { getAuthClaims } from "@/lib/auth";

export default async function AccountPage() {
  const claims = await getAuthClaims();

  if (!claims) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">
          Your appointments
        </p>
        <h1 className="mt-5 text-5xl">Your private appointment space.</h1>
        <p className="mt-4 max-w-lg leading-7 text-foreground/70">
          Sign in to view and manage your appointments.
        </p>
        <Link
          href="/account/login"
          className="mt-8 inline-flex min-h-12 w-fit items-center rounded-full bg-foreground px-6 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 sm:px-10 lg:px-12">
      <CustomerPortal />
    </main>
  );
}
