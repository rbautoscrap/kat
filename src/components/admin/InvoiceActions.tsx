"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOverseasInvoice } from "@/app/admin/invoice-actions";
import { adminDangerBtnClass } from "@/lib/admin-ui";

type Props = {
  invoiceId: string;
};

export function InvoiceActions({ invoiceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onDelete() {
    if (!confirm("이 해외 인보이스를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteOverseasInvoice(invoiceId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push("/admin/invoices");
      router.refresh();
    });
  }

  return (
    <div className="invoice-no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
