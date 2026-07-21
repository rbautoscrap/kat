"use client";

import { useState } from "react";

type Props = {
  listingId: string;
  imageCount: number;
};

export function DownloadListingImagesButton({
  listingId,
  imageCount,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    if (pending || imageCount <= 0) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        `/api/admin/listings/${listingId}/images/zip`,
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? "이미지 다운로드에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `listing-${listingId}-photos.zip`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("이미지 다운로드에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onDownload}
        disabled={pending || imageCount <= 0}
        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3.5 text-[13px] font-medium tracking-wide text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "준비 중…"
          : `이미지 전체 다운로드 (${imageCount})`}
      </button>
      {error ? (
        <p className="max-w-[16rem] text-right text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
