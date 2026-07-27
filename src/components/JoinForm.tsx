"use client";

import { useActionState } from "react";
import {
  registerAccount,
  type RegisterState,
} from "@/app/join/actions";
import { PASSWORD_HINT } from "@/lib/login-id";

const fieldClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/50 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white";
const labelClass =
  "mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600";
const hintClass =
  "mt-1 block text-[12px] leading-relaxed tracking-wide text-neutral-400";

type Props = {
  onLoginClick?: () => void;
};

export function JoinForm({ onLoginClick }: Props) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAccount,
    null,
  );

  return (
    <form action={formAction} className="w-full space-y-3.5">
      <div>
        <h1 className="site-heading text-[1.15rem] text-neutral-900">Join</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed tracking-wide text-neutral-500">
          New accounts require administrator approval before you can sign in.
        </p>
      </div>
      <label className="block">
        <span className={labelClass}>Name</span>
        <input
          name="name"
          required
          minLength={2}
          autoComplete="name"
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>ID</span>
        <input
          name="email"
          type="text"
          required
          minLength={2}
          autoComplete="username"
          className={fieldClass}
        />
        <span className={hintClass}>
          This ID is what you use to log in (not your display name).
        </span>
      </label>
      <label className="block">
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
        <span className={hintClass}>
          Used so administrators can reach you about offers. One contact number
          per account.
        </span>
      </label>
      <label className="block">
        <span className={labelClass}>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={fieldClass}
        />
        <span className={hintClass}>{PASSWORD_HINT}</span>
      </label>
      <label className="block">
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
      {state?.error ? (
        <p className="text-[13px] leading-relaxed text-red-600">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-[13px] text-neutral-600">
        Already joined?{" "}
        {onLoginClick ? (
          <button
            type="button"
            onClick={onLoginClick}
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            Login
          </button>
        ) : (
          <a
            href="/login"
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            Login
          </a>
        )}
      </p>
    </form>
  );
}
