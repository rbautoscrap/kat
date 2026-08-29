"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOverseasInvoice } from "@/app/admin/invoice-actions";
import { adminDangerBtnClass, adminDangerBtnCompactClass } from "@/lib/admin-ui";

type Props = { id: string; compact?: boolean };

export function InvoiceDeleteButton({ id, compact = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={compact ? adminDangerBtnCompactClass : adminDangerBtnClass}
      onClick={() => {
        if (!confirm("이 해외 인보이스를 삭제할까요?")) return;
        startTransition(async () => {
          const result = await deleteOverseasInvoice(id);
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
