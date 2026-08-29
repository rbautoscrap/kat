"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { diagnoseLogin } from "@/app/login/actions";
import { normalizeLoginId } from "@/lib/login-id";
import { loginErrorMessage } from "@/lib/login-messages";

type Props = {
  callbackUrl: string;
  defaultId?: string;
  errorMessage?: string | null;
  pending?: boolean;
  registered?: boolean;
  /** Compact layout inside the popup */
  compact?: boolean;
  onJoinClick?: () => void;
};

export function LoginForm({
  callbackUrl,
  defaultId = "",
  errorMessage,
  pending,
  registered,
  compact = false,
  onJoinClick,
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

    const nextPath =
      callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/";

    try {
      try {
        const diagnosed = await diagnoseLogin(loginId, password);
        if (!diagnosed.ok) {
          setLocalError(loginErrorMessage(diagnosed.reason));
          setSubmitting(false);
          return;
        }
      } catch {
        // Server action failed — still try Auth.js so login is not blocked.
      }

      const result = await signIn("credentials", {
        email: loginId,
        password,
        redirect: false,
        callbackUrl: nextPath,
      });

      if (!result || result.error) {
        const code = result?.code || result?.error || "CredentialsSignin";
        setLocalError(loginErrorMessage(code));
        setSubmitting(false);
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setLocalError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <h1
        className={`site-heading text-neutral-900 ${
          compact ? "text-[1.15rem]" : "text-[1.2rem]"
        }`}
      >
        Login
      </h1>
      {pending && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
          Account created. An administrator must approve your account before you
          can sign in.
        </p>
      )}
      {registered && !pending && (
        <p className="text-[13px] text-emerald-700">
          Account created. Sign in with the ID you just registered.
        </p>
      )}
      {(localError || errorMessage) && (
        <p className="text-[13px] leading-relaxed text-red-600">
          {localError || errorMessage}
        </p>
      )}
      <label className="block">
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
          autoFocus={compact}
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/50 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={1}
          autoComplete="current-password"
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/50 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Login"}
      </button>
      <p className="text-center text-[13px] text-neutral-600">
        No account?{" "}
        {onJoinClick ? (
          <button
            type="button"
            onClick={onJoinClick}
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            Join
          </button>
        ) : (
          <Link
            href="/join"
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            Join
          </Link>
        )}
      </p>
    </form>
  );
}
