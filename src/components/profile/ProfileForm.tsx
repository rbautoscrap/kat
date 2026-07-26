"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { updateProfile } from "@/app/profile/actions";

export type ProfileUser = {
  name: string;
  email: string;
  role: Role;
};

type Props = {
  user: ProfileUser;
  /** Compact stacked layout for popup */
  compact?: boolean;
  onOffersClick?: () => void;
};

const ROLE_LABELS_EN: Record<Role, string> = {
  MEMBER: "Member",
  AUTHORIZED: "Authorized",
  ADMIN: "Admin",
};

const inputClass =
  "h-10 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none focus:border-neutral-400";

const hintClass =
  "mt-1 block text-[12px] leading-relaxed tracking-wide text-neutral-400";

const labelClass =
  "mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600";

export function ProfileForm({ user, compact, onOffersClick }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setError(null);
    setSuccess(false);
    setPending(true);

    const form = new FormData(formEl);
    const result = await updateProfile({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      currentPassword: String(form.get("currentPassword") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    const currentPassword = formEl.elements.namedItem(
      "currentPassword",
    ) as HTMLInputElement | null;
    const password = formEl.elements.namedItem(
      "password",
    ) as HTMLInputElement | null;
    if (currentPassword) currentPassword.value = "";
    if (password) password.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0" lang="en">
      <div className="mb-4">
        <h1 className="site-heading text-[1.15rem] text-neutral-900">
          Profile
        </h1>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
          Update your name, login ID, or password.
        </p>
        <p className="mt-2 text-[12.5px] text-neutral-500">
          <Link
            href="/offers"
            onClick={onOffersClick}
            className="font-semibold text-neutral-900 underline-offset-2 hover:underline"
          >
            My offers →
          </Link>
        </p>
      </div>

      <div className={compact ? "space-y-3.5" : "space-y-4"}>
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            id="profile-name"
            name="name"
            required
            minLength={2}
            defaultValue={user.name}
            autoComplete="name"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>ID</span>
          <input
            id="profile-id"
            name="email"
            type="text"
            required
            minLength={2}
            defaultValue={user.email}
            autoComplete="username"
            className={inputClass}
          />
          <span className={hintClass}>
            Used to log in. Separate from your display name.
          </span>
        </label>

        <div>
          <span className={labelClass}>Role</span>
          <span className="inline-flex h-10 max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-[13.5px] tracking-wide text-neutral-700">
            {ROLE_LABELS_EN[user.role]}
          </span>
        </div>

        <label className="block">
          <span className={labelClass}>Current password</span>
          <input
            id="profile-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Required only when changing password"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>New password</span>
          <input
            id="profile-new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            placeholder="Leave blank to keep current"
            className={inputClass}
          />
          <span className={hintClass}>
            At least 6 characters, mixing letters and numbers.
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        <div className="min-h-5 min-w-0 flex-1 text-[13px]">
          {error ? <p className="break-words text-red-600">{error}</p> : null}
          {success && !error ? (
            <p className="text-emerald-700">Profile saved.</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 shrink-0 min-w-[6.5rem] items-center justify-center rounded-md bg-neutral-900 px-4 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
