"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePurchaseOffer } from "@/lib/offer-actions";

type Props = {
  offerId: string;
  /** Optional confirm label context */
  label?: string;
  className?: string;
};

export function DeleteOfferButton({ offerId, label, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="오퍼 삭제"
      aria-label={label ? `오퍼 삭제: ${label}` : "오퍼 삭제"}
      onClick={() => {
        if (
          !window.confirm(
            "이 오퍼를 삭제할까요?\n삭제 후에는 복구할 수 없습니다.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await deletePurchaseOffer(offerId);
          if (!result.ok) {
            alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className={
        className ??
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] font-semibold leading-none text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      }
    >
      {pending ? "…" : "×"}
    </button>
  );
}
