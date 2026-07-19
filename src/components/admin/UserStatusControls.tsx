"use client";

import { useTransition } from "react";
import type { AccountStatus } from "@prisma/client";
import { setUserAccountStatus } from "@/app/admin/actions";
import { adminActionBtnClass, adminDangerBtnClass } from "@/lib/admin-ui";

type Props = {
  userId: string;
  status: AccountStatus;
  disabled?: boolean;
};

export function UserStatusControls({ userId, status, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: AccountStatus) {
    startTransition(async () => {
      const result = await setUserAccountStatus(userId, next);
      if (!result.ok) alert(result.error);
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={disabled || pending}
          className={adminActionBtnClass}
          onClick={() => setStatus("APPROVED")}
        >
          승인
        </button>
        <button
          type="button"
          disabled={disabled || pending}
          className={adminDangerBtnClass}
          onClick={() => setStatus("REJECTED")}
        >
          거절
        </button>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <button
        type="button"
        disabled={disabled || pending}
        className={adminActionBtnClass}
        onClick={() => setStatus("APPROVED")}
      >
        승인
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={adminDangerBtnClass}
      title="로그인 불가 상태로 변경합니다"
      onClick={() => {
        if (!confirm("이 회원의 승인을 취소할까요? 로그인할 수 없게 됩니다.")) {
          return;
        }
        setStatus("PENDING");
      }}
    >
      승인 취소
    </button>
  );
}
