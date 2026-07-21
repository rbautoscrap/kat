"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmListingDelete } from "@/lib/confirm-listing-delete";

type Props = {
  listingId: string;
  categoryPath: string;
};

export function ListingOwnerActions({ listingId, categoryPath }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
