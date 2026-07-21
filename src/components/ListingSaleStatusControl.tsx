"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ListingSaleStatus } from "@prisma/client";
import { updateListingSaleStatus } from "@/app/admin/actions";
import { SALE_STATUS_ADMIN_LABELS } from "@/lib/admin-labels";

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;

type Props = {
  listingId: string;
  saleStatus: ListingSaleStatus;
  /** Compact segmented control for listing cards */
  compact?: boolean;
};

export function ListingSaleStatusControl({
  listingId,
  saleStatus,
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(next: ListingSaleStatus) {
    if (next === saleStatus || pending) return;
    startTransition(async () => {
      const result = await updateListingSaleStatus(listingId, next);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (compact) {
    return (
      <div
        className="mt-1.5 grid grid-cols-3 gap-0.5"
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {STATUSES.map((status) => {
          const active = saleStatus === status;
          return (
            <button
              key={status}
              type="button"
              disabled={pending}
              title={SALE_STATUS_ADMIN_LABELS[status]}
              aria-pressed={active}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStatus(status);
              }}
              className={`h-6 truncate rounded px-0.5 text-[10px] font-semibold leading-none transition disabled:opacity-50 ${
                active
                  ? status === "SOLD"
                    ? "bg-neutral-800 text-white"
                    : status === "RESERVED"
                      ? "bg-sky-600 text-white"
                      : "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
              }`}
            >
              {status === "AVAILABLE"
                ? "판매"
                : status === "RESERVED"
                  ? "예약"
                  : "완료"}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col gap-1"
      role="group"
      aria-label="판매 상태"
    >
      <p className="text-[10.5px] font-semibold tracking-wide text-neutral-400 uppercase">
        판매 상태
      </p>
      <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 bg-white">
        {STATUSES.map((status) => {
          const active = saleStatus === status;
          return (
            <button
              key={status}
              type="button"
              disabled={pending}
              aria-pressed={active}
              onClick={() => setStatus(status)}
              className={`h-8 min-w-[4.75rem] px-2.5 text-[12.5px] font-semibold transition disabled:opacity-50 ${
                active
                  ? status === "SOLD"
                    ? "bg-neutral-800 text-white"
                    : status === "RESERVED"
                      ? "bg-sky-600 text-white"
                      : "bg-emerald-600 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              } ${status !== "AVAILABLE" ? "border-l border-neutral-200" : ""}`}
            >
              {SALE_STATUS_ADMIN_LABELS[status]}
            </button>
          );
        })}
      </div>
      {pending ? (
        <p className="text-[11px] text-neutral-400">저장 중…</p>
      ) : null}
    </div>
  );
}
