"use client";

import { useState } from "react";
import type { ListingCategory } from "@prisma/client";
import { AuthModalShell } from "@/components/AuthModalShell";
import { ListingForm } from "@/components/ListingForm";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  defaultCategory?: ListingCategory;
};

/** Shared create dialog (admin list button or /listings/new). */
export function ListingCreateDialog({
  open,
  onClose,
  defaultCategory,
}: DialogProps) {
  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title="매물 등록"
      maxWidthClass="max-w-3xl"
      closeLabel="닫기"
      closeOnBackdrop={false}
      closeButtonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-red-50 hover:text-red-700"
    >
      <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
        매물 등록
      </h2>
      <p className="mt-1 text-[12.5px] text-neutral-500">
        차량 카테고리와 중고부품(Used Parts)을 등록할 수 있습니다. 중고부품은
        부품명·사진 중심으로 간단히 등록하세요.
      </p>
      <div className="mt-5">
        <ListingForm onCancel={onClose} defaultCategory={defaultCategory} />
      </div>
    </AuthModalShell>
  );
}

/** Admin listings toolbar trigger. */
export function NewListingModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white hover:bg-neutral-700"
      >
        + 매물 등록
      </button>
      <ListingCreateDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
