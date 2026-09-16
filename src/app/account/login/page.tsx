import type { Metadata } from "next";
import Link from "next/link";

import { PasswordlessLoginForm } from "@/components/auth/passwordless-login-form";

export const metadata: Metadata = {
  title: "Your appointments",
};

export default function AccountLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-line bg-surface p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">
          Your appointments
        </p>
        <h1 className="mt-5 text-4xl">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          Sign in with your email to view upcoming and previous appointments.
        </p>
        <div className="mt-8">
          <PasswordlessLoginForm mode="customer" />
        </div>
        <Link
          href="/admin/login"
          className="mt-6 block text-center text-sm font-semibold text-brand-deep hover:text-foreground"
        >
          Staff Sign In
        </Link>
      </section>
    </main>
  );
}
