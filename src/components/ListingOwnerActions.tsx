"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bumpListingToFront } from "@/app/admin/actions";
import { confirmListingDelete } from "@/lib/confirm-listing-delete";

type Props = {
  listingId: string;
  categoryPath: string;
  /** Admin-only: pin this listing to the front of public lists for 24h. */
  canBump?: boolean;
};

export function ListingOwnerActions({
  listingId,
  categoryPath,
  canBump = false,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [bumping, startBump] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onBump() {
    setError(null);
    startBump(async () => {
      const result = await bumpListingToFront(listingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function onDelete() {
    if (!confirmListingDelete()) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Failed to delete listing.");
        setPending(false);
        return;
      }
      router.push(categoryPath);
      router.refresh();
    } catch {
      setError("Failed to delete listing.");
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {canBump ? (
          <button
            type="button"
            onClick={onBump}
            disabled={pending || bumping}
            title="24시간 동안 목록 맨 앞으로 이동합니다"
            className="rounded-md border border-neutral-200 px-3.5 py-1.5 text-[13px] tracking-wide text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            {bumping ? "이동 중…" : "상단"}
          </button>
        ) : null}
        <Link
          href={`/listings/${listingId}/edit`}
          className="rounded-md border border-neutral-200 px-3.5 py-1.5 text-[13px] tracking-wide text-neutral-700 hover:bg-neutral-50"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-md border border-red-200 px-3.5 py-1.5 text-[13px] tracking-wide text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error ? (
        <p className="max-w-[16rem] text-right text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
