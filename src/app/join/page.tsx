"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAccount, type RegisterState } from "./actions";
import { PASSWORD_HINT } from "@/lib/login-id";

const fieldClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white";
const labelClass =
  "mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600";

export default function JoinPage() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAccount,
    null,
  );

  return (
    <div className="site-container py-10" lang="en">
      <form action={formAction} className="mx-auto w-full max-w-sm space-y-4">
        <h1 className="site-heading text-[1.2rem] text-neutral-800">Join</h1>
        <p className="text-[13.5px] leading-relaxed tracking-wide text-neutral-500">
          New accounts require administrator approval before you can sign in.
          Only administrators can register listings.
        </p>
        <label className="block text-sm">
          <span className={labelClass}>Name</span>
          <input
            name="name"
            required
            minLength={2}
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>ID</span>
          <input
            name="email"
            type="text"
            required
            minLength={2}
            autoComplete="username"
            className={fieldClass}
          />
          <span className="mt-1 block text-[12px] tracking-wide text-neutral-400">
            This ID is what you use to log in (not your display name).
          </span>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Contact</span>
          <input
            name="phone"
            type="tel"
            required
            minLength={8}
            autoComplete="tel"
            placeholder="WhatsApp / phone number"
            className={fieldClass}
          />
          <span className="mt-1 block text-[12px] tracking-wide text-neutral-400">
            Used so administrators can reach you about offers.
          </span>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={fieldClass}
          />
          <span className="mt-1 block text-[12px] leading-relaxed tracking-wide text-neutral-400">
            {PASSWORD_HINT}
          </span>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={fieldClass}
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-800 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-[13.5px] text-neutral-600">
          Already joined?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
