"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { updateUser } from "@/app/admin/actions";
import { ROLE_LABELS } from "@/lib/admin-labels";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
};

const fieldClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white";
const labelClass =
  "mb-1.5 block text-[13px] font-medium text-neutral-600";

const roles: Role[] = ["MEMBER", "AUTHORIZED", "ADMIN"];

export function AdminUserForm({ user }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const result = await updateUser(user.id, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? "MEMBER") as Role,
      password: String(form.get("password") ?? ""),
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/admin/users");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4">
      <label className="block text-sm">
        <span className={labelClass}>이름</span>
        <input
          name="name"
          required
          minLength={2}
          defaultValue={user.name}
          className={fieldClass}
        />
      </label>

      <label className="block text-sm">
        <span className={labelClass}>아이디</span>
        <input
          name="email"
          required
          minLength={2}
          autoComplete="username"
          defaultValue={user.email}
          className={fieldClass}
        />
        <span className="mt-1 block text-[12px] text-neutral-400">
          로그인에 사용하는 아이디입니다. (이름과 별개)
        </span>
      </label>

      <label className="block text-sm">
        <span className={labelClass}>역할</span>
        <select
          name="role"
          required
          defaultValue={user.role}
          className={fieldClass}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className={labelClass}>
          새 비밀번호{" "}
          <span className="font-normal text-neutral-400">
            (변경 시에만 입력)
          </span>
        </span>
        <input
          name="password"
          type="password"
          minLength={6}
          placeholder="비워두면 기존 비밀번호 유지"
          className={fieldClass}
        />
        <span className="mt-1 block text-[12px] leading-relaxed text-neutral-400">
          변경 시 6자 이상, 영문과 숫자 혼합
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-800 px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="rounded-md border border-neutral-200 px-5 py-2.5 text-[13.5px] text-neutral-700 hover:bg-neutral-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
