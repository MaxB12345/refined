import type { Metadata } from "next";

import { PasswordlessLoginForm } from "@/components/auth/passwordless-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-line bg-surface p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-deep">
          Sculpted by Ruby
        </p>
        <h1 className="mt-5 text-4xl">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          Use the beautician account email to receive a secure sign-in code.
        </p>
        <div className="mt-8">
          <PasswordlessLoginForm mode="admin" />
        </div>
      </section>
    </main>
  );
}
