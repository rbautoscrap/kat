"use client";

import { useState } from "react";
import { AuthModalShell } from "@/components/AuthModalShell";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import type { ListingOption } from "@/lib/overseas-invoice";

type Props = {
  listings: ListingOption[];
  defaultInvoiceDate: string;
};

export function NewInvoiceModal({ listings, defaultInvoiceDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white transition hover:bg-neutral-700"
      >
        + 새 인보이스
      </button>
      <AuthModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="해외 인보이스 작성"
        maxWidthClass="max-w-3xl"
        closeLabel="닫기"
        closeOnBackdrop={false}
        closeButtonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-red-50 hover:text-red-700"
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
          해외 인보이스 작성
        </h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          영문 Commercial Invoice입니다. 저장 후 출력·이미지 저장이 가능합니다.
        </p>
        <div className="mt-5">
          <InvoiceForm
            mode="create"
            listings={listings}
            defaultInvoiceDate={defaultInvoiceDate}
            onCancel={() => setOpen(false)}
          />
        </div>
      </AuthModalShell>
    </>
  );
}
