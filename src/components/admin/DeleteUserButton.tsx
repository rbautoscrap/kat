"use client";

import { useTransition } from "react";
import { deleteUser } from "@/app/admin/actions";
import { adminDangerBtnClass } from "@/lib/admin-ui";

type Props = {
  userId: string;
  userName: string;
  listingCount: number;
  disabled?: boolean;
};

export function DeleteUserButton({
  userId,
  userName,
  listingCount,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={adminDangerBtnClass}
      onClick={() => {
        const listingNote =
          listingCount > 0
            ? `\n등록된 매물 ${listingCount}개도 함께 삭제됩니다.`
            : "";
        if (
          !confirm(
            `'${userName}' 회원을 삭제하시겠습니까?${listingNote}\n이 작업은 되돌릴 수 없습니다.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await deleteUser(userId);
          if (!result.ok) alert(result.error);
        });
      }}
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
