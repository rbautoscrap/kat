"use client";

import { useState } from "react";

type Props = {
  listingId: string;
  group1Count: number;
  group2Count: number;
};

export function DownloadListingImagesButton({
  listingId,
  group1Count,
  group2Count,
}: Props) {
  const [pending, setPending] = useState<1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const split = group1Count > 0 && group2Count > 0;
  const groups = ([
    [1, group1Count],
    [2, group2Count],
  ] as const).filter(([, count]) => count > 0);

  async function onDownload(group: 1 | 2) {
    if (pending) return;
    setError(null);
    setPending(group);
    try {
      const res = await fetch(
        `/api/admin/listings/${listingId}/images/zip?group=${group}`,
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
      const filename =
        match?.[1] ?? `listing-${listingId}-G${group}-photos.zip`;
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
      setPending(null);
    }
  }

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        {groups.map(([group, count]) => (
          <button
            key={group}
            type="button"
            onClick={() => onDownload(group)}
            disabled={pending !== null}
            className="inline-flex h-8 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-[12.5px] font-medium tracking-wide text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === group
              ? "준비 중…"
              : split
                ? `${group}그룹 다운로드 (${count})`
                : `이미지 전체 다운로드 (${count})`}
          </button>
        ))}
      </div>
      {error ? (
        <p className="max-w-[16rem] text-right text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
