"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { updateProfile } from "@/app/profile/actions";

type Props = {
  user: {
    name: string;
    email: string;
    role: Role;
  };
};

const ROLE_LABELS_EN: Record<Role, string> = {
  MEMBER: "Member",
  AUTHORIZED: "Authorized",
  ADMIN: "Admin",
};

const inputClass =
  "h-10 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none focus:border-neutral-400";

const labelClass =
  "border-[var(--line)] bg-neutral-50/90 px-3.5 py-3.5 text-[13px] font-medium tracking-wide text-neutral-500 sm:border-r";

const fieldClass = "min-w-0 px-3.5 py-3.5";

function FieldRow({
  label,
  htmlFor,
  children,
  last = false,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)] ${
        last ? "" : "border-b border-[var(--line)]"
      }`}
    >
      <label htmlFor={htmlFor} className={`${labelClass} flex items-center`}>
        {label}
      </label>
      <div className={fieldClass}>{children}</div>
    </div>
  );
}

export function ProfileForm({ user }: Props) {
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
    <form
      onSubmit={onSubmit}
      className="w-full min-w-0 overflow-hidden rounded-sm border border-[var(--line)] bg-white"
      lang="en"
    >
      <div className="w-full min-w-0">
        <FieldRow label="Name" htmlFor="profile-name">
          <input
            id="profile-name"
            name="name"
            required
            minLength={2}
            defaultValue={user.name}
            autoComplete="name"
            className={inputClass}
          />
        </FieldRow>

        <FieldRow label="ID" htmlFor="profile-id">
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
          <p className="mt-1.5 break-words text-[12px] leading-relaxed tracking-wide text-neutral-400">
            Used to log in. Separate from your display name.
          </p>
        </FieldRow>

        <FieldRow label="Role">
          <span className="inline-flex h-10 max-w-full items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-[13.5px] tracking-wide text-neutral-700">
            {ROLE_LABELS_EN[user.role]}
          </span>
          <p className="mt-1.5 break-words text-[12px] leading-relaxed tracking-wide text-neutral-400">
            Role changes are managed by an administrator.
          </p>
        </FieldRow>

        <FieldRow label="Current password" htmlFor="profile-current-password">
          <input
            id="profile-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Required only when changing password"
            className={inputClass}
          />
        </FieldRow>

        <FieldRow label="New password" htmlFor="profile-new-password" last>
          <input
            id="profile-new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            placeholder="Leave blank to keep current password"
            className={inputClass}
          />
          <p className="mt-1.5 break-words text-[12px] leading-relaxed tracking-wide text-neutral-400">
            At least 6 characters, mixing letters and numbers.
          </p>
        </FieldRow>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="min-h-5 min-w-0 flex-1 text-[13px]">
          {error && <p className="break-words text-red-600">{error}</p>}
          {success && !error && (
            <p className="text-emerald-700">Profile saved successfully.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 shrink-0 min-w-[7rem] items-center justify-center rounded-md bg-neutral-800 px-4 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
