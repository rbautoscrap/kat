"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStatement } from "@/app/admin/statement-actions";
import { adminDangerBtnClass } from "@/lib/admin-ui";

type Props = { id: string };

export function StatementDeleteButton({ id }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={adminDangerBtnClass}
      onClick={() => {
        if (!confirm("이 거래명세서를 삭제할까요?")) return;
        startTransition(async () => {
          const result = await deleteStatement(id);
          if (!result.ok) {
            alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      삭제
    </button>
  );
}
