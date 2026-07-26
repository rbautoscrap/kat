"use client";

import { useTransition } from "react";
import type { AccountStatus } from "@prisma/client";
import { setUserAccountStatus } from "@/app/admin/actions";
import {
  adminActionBtnClass,
  adminActionBtnCompactClass,
  adminDangerBtnClass,
  adminDangerBtnCompactClass,
} from "@/lib/admin-ui";

type Props = {
  userId: string;
  status: AccountStatus;
  disabled?: boolean;
  compact?: boolean;
};

export function UserStatusControls({
  userId,
  status,
  disabled,
  compact,
}: Props) {
  const [pending, startTransition] = useTransition();
  const actionClass = compact ? adminActionBtnCompactClass : adminActionBtnClass;
  const dangerClass = compact
    ? adminDangerBtnCompactClass
    : adminDangerBtnClass;

  function setStatus(next: AccountStatus) {
    startTransition(async () => {
      const result = await setUserAccountStatus(userId, next);
      if (!result.ok) alert(result.error);
    });
  }

  if (status === "PENDING") {
    return (
      <>
        <button
          type="button"
          disabled={disabled || pending}
          className={actionClass}
          onClick={() => setStatus("APPROVED")}
        >
          승인
        </button>
        <button
          type="button"
          disabled={disabled || pending}
          className={dangerClass}
          onClick={() => setStatus("REJECTED")}
        >
          거절
        </button>
      </>
    );
  }

  if (status === "REJECTED") {
    return (
      <button
        type="button"
        disabled={disabled || pending}
        className={actionClass}
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
      className={dangerClass}
      title="로그인 불가 상태로 변경합니다"
      onClick={() => {
        if (!confirm("이 회원의 승인을 취소할까요? 로그인할 수 없게 됩니다.")) {
          return;
        }
        setStatus("PENDING");
      }}
    >
      {compact ? "취소" : "승인 취소"}
    </button>
  );
}
