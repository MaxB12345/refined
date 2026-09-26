"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-deep">Something went wrong</p>
        <h1 className="mt-5 text-5xl leading-[1.05] sm:text-6xl">We couldn&apos;t load this page.</h1>
        <p className="mt-6 text-base leading-8 text-foreground/70">
          This is usually temporary. Please try again in a moment.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => retry()}
            className="min-h-12 rounded-full bg-foreground px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-sm font-semibold hover:bg-surface"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
