"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStatement } from "@/app/admin/statement-actions";
import {
  adminActionBtnClass,
  adminDangerBtnClass,
} from "@/lib/admin-ui";

type Props = {
  statementId: string;
};

export function StatementActions({ statementId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onPrint() {
    window.print();
  }

  function onDelete() {
    if (!confirm("이 거래명세서를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteStatement(statementId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push("/admin/statements");
      router.refresh();
    });
  }

  return (
    <div className="statement-no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={onPrint}
        disabled={pending}
        className={adminActionBtnClass}
      >
        출력
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className={adminDangerBtnClass}
      >
        삭제
      </button>
      {message ? (
        <p className="w-full text-[13px] text-red-600" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
