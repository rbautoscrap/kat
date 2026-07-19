"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import {
  bumpListingToFront,
  deleteListing,
  updateListingCategory,
  updateListingSaleStatus,
} from "@/app/admin/actions";
import {
  ADMIN_CATEGORY_LABELS,
  SALE_STATUS_ADMIN_LABELS,
} from "@/lib/admin-labels";
import {
  adminActionBtnClass,
  adminDangerBtnClass,
  adminSelectClass,
} from "@/lib/admin-ui";

const categories = Object.keys(ADMIN_CATEGORY_LABELS) as ListingCategory[];
const saleStatuses = Object.keys(
  SALE_STATUS_ADMIN_LABELS,
) as ListingSaleStatus[];

type Props = {
  listingId: string;
  category: ListingCategory;
  saleStatus: ListingSaleStatus;
};

export function ListingAdminControls({
  listingId,
  category,
  saleStatus,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-[13.5rem] flex-col items-stretch gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <select
          defaultValue={category}
          disabled={pending}
          aria-label="카테고리"
          className={`${adminSelectClass} w-full`}
          onChange={(e) => {
            const next = e.target.value as ListingCategory;
            const previous = category;
            startTransition(async () => {
              const result = await updateListingCategory(listingId, next);
              if (!result.ok) {
                alert(result.error);
                e.target.value = previous;
              }
            });
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {ADMIN_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          defaultValue={saleStatus}
          disabled={pending}
          aria-label="판매 상태"
          className={`${adminSelectClass} w-full`}
          onChange={(e) => {
            const next = e.target.value as ListingSaleStatus;
            const previous = saleStatus;
            startTransition(async () => {
              const result = await updateListingSaleStatus(listingId, next);
              if (!result.ok) {
                alert(result.error);
                e.target.value = previous;
              }
            });
          }}
        >
          {saleStatuses.map((s) => (
            <option key={s} value={s}>
              {SALE_STATUS_ADMIN_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={pending}
          title="가장 최근에 등록한 것처럼 맨 앞으로 이동합니다"
          className={`${adminActionBtnClass} w-full px-1.5`}
          onClick={() => {
            startTransition(async () => {
              const result = await bumpListingToFront(listingId);
              if (!result.ok) alert(result.error);
            });
          }}
        >
          상단
        </button>
        <Link
          href={`/listings/${listingId}/edit`}
          className={`${adminActionBtnClass} w-full px-1.5`}
        >
          수정
        </Link>
        <button
          type="button"
          disabled={pending}
          className={`${adminDangerBtnClass} w-full px-1.5`}
          onClick={() => {
            if (!confirm("이 매물을 정말 삭제하시겠습니까?")) return;
            startTransition(async () => {
              const result = await deleteListing(listingId);
              if (!result.ok) alert(result.error);
            });
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
