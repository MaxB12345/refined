"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PasswordlessLoginFormProps = {
  mode: "admin" | "customer";
};

export function PasswordlessLoginForm({ mode }: PasswordlessLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = mode === "admin";

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createSupabaseBrowserClient();
    const { error: requestError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: !isAdmin },
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setEmail(normalizedEmail);
      setCodeRequested(true);
      setMessage("Check your email for the six-digit sign-in code.");
    }

    setBusy(false);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      setBusy(false);
      return;
    }

    if (!isAdmin) {
      await supabase.rpc("link_customer_to_auth");
    }

    router.replace(isAdmin ? "/admin" : "/account");
    router.refresh();
  }

  if (codeRequested) {
    return (
      <form className="space-y-5" onSubmit={verifyCode}>
        <div>
          <label className="text-sm font-semibold" htmlFor="code">
            Sign-in code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 text-center text-lg tracking-[0.35em] outline-none focus:border-brand"
          />
        </div>
        <p className="text-sm leading-6 text-foreground/70">
          We sent a code to <strong>{email}</strong>.
        </p>
        {message && <p className="text-sm text-brand-deep">{message}</p>}
        {error && <p className="text-sm text-foreground">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Checking code..." : "Continue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCodeRequested(false);
            setCode("");
            setMessage("");
            setError("");
          }}
          className="w-full text-sm font-semibold text-brand-deep hover:text-foreground"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={requestCode}>
      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-brand"
        />
      </div>
      {message && <p className="text-sm text-brand-deep">{message}</p>}
      {error && <p className="text-sm text-foreground">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-full bg-foreground px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Sending code..." : "Email me a sign-in code"}
      </button>
    </form>
  );
}
