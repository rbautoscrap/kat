"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { normalizeLoginId } from "@/lib/login-id";

type Props = {
  callbackUrl: string;
  defaultId?: string;
  errorMessage?: string | null;
  pending?: boolean;
  registered?: boolean;
};

export function LoginForm({
  callbackUrl,
  defaultId = "",
  errorMessage,
  pending,
  registered,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const loginId = normalizeLoginId(
      String(new FormData(form).get("email") ?? ""),
    );
    const password = String(new FormData(form).get("password") ?? "");

    const result = await signIn("credentials", {
      email: loginId,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      const code = result?.code || result?.error || "CredentialsSignin";
      window.location.href = `/login?error=${encodeURIComponent(code)}&callbackUrl=${encodeURIComponent(callbackUrl)}&id=${encodeURIComponent(loginId)}`;
      return;
    }

    window.location.href = result.url || callbackUrl;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-4">
      <h1 className="site-heading text-[1.2rem] text-neutral-800">Login</h1>
      {pending && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13.5px] leading-relaxed text-amber-900">
          Account created. An administrator must approve your account before you
          can sign in.
        </p>
      )}
      {registered && !pending && (
        <p className="text-sm text-emerald-700">
          Account created. Sign in with the ID you just registered.
        </p>
      )}
      {(localError || errorMessage) && (
        <p className="text-sm text-red-600">{localError || errorMessage}</p>
      )}
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          ID
        </span>
        <input
          name="email"
          type="text"
          required
          minLength={2}
          defaultValue={defaultId}
          autoComplete="username"
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={1}
          autoComplete="current-password"
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-800 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Login"}
      </button>
      <p className="text-center text-[13.5px] text-neutral-600">
        No account?{" "}
        <Link href="/join" className="underline">
          Join
        </Link>
      </p>
    </form>
  );
}
