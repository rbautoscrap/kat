"use client";

import { useRef, useState } from "react";

type ManualItem = {
  id: string;
  href: string;
  filename: string;
  title: string;
  langLabel: string;
};

const MANUALS: ManualItem[] = [
  {
    id: "en",
    href: "/manuals/kat-manual.pdf",
    filename: "KAT Manual.pdf",
    title: "Buyer Manual (English)",
    langLabel: "EN",
  },
  {
    id: "ko",
    href: "/manuals/kat-manual-ko.pdf",
    filename: "KAT Manual (Kor).pdf",
    title: "바이어 매뉴얼 (한국어)",
    langLabel: "KO",
  },
];

type ProgressState = {
  id: string;
  loaded: number;
  total: number | null;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

async function downloadWithProgress(
  href: string,
  filename: string,
  onProgress: (loaded: number, total: number | null) => void,
) {
  const res = await fetch(href, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Download failed");

  const totalHeader = res.headers.get("Content-Length");
  const total = totalHeader ? Number(totalHeader) : null;
  const usableTotal =
    total != null && Number.isFinite(total) && total > 0 ? total : null;

  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    onProgress(blob.size, blob.size);
    triggerBlobDownload(blob, filename);
    return;
  }

  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, usableTotal);
    }
  }
  const blob = new Blob(chunks, { type: "application/pdf" });
  onProgress(blob.size, usableTotal ?? blob.size);
  triggerBlobDownload(blob, filename);
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 2.75h6.2L19 8.55V20.25a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.1 2.9V8.4H18.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ManualDownloads() {
  const lockRef = useRef<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function onDownload(item: ManualItem) {
    if (lockRef.current) return;
    lockRef.current = item.id;
    setBusyId(item.id);
    setErrorId(null);
    setDoneId(null);
    setProgress({ id: item.id, loaded: 0, total: null });
    try {
      await downloadWithProgress(item.href, item.filename, (loaded, total) => {
        setProgress({ id: item.id, loaded, total });
      });
      setDoneId(item.id);
      window.setTimeout(() => {
        setDoneId((cur) => (cur === item.id ? null : cur));
      }, 2200);
    } catch {
      setErrorId(item.id);
    } finally {
      lockRef.current = null;
      setBusyId(null);
      setProgress(null);
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-[var(--line)]">
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[2.75rem]" />
          <col />
          <col className="w-[7.5rem] sm:w-[8.5rem]" />
        </colgroup>
        <tbody>
          {MANUALS.map((item, index) => {
            const active = progress?.id === item.id;
            const pct =
              active && progress.total && progress.total > 0
                ? Math.min(
                    100,
                    Math.round((progress.loaded / progress.total) * 100),
                  )
                : null;
            const blocked = busyId != null && busyId !== item.id;
            const isDone = doneId === item.id;
            const isError = errorId === item.id;

            return (
              <tr
                key={item.id}
                className={
                  index < MANUALS.length - 1
                    ? "border-b border-[var(--line)]"
                    : ""
                }
              >
                <td className="border-r border-[var(--line)] bg-neutral-50 px-2 py-2.5 text-center text-neutral-600 sm:px-2.5">
                  <span className="inline-flex items-center justify-center">
                    <PdfIcon />
                  </span>
                </td>
                <td className="min-w-0 px-3 py-2.5 sm:px-3.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-white">
                      {item.langLabel}
                    </span>
                    <span className="truncate text-[13.5px] font-medium tracking-wide text-neutral-800">
                      {item.title}
                    </span>
                  </div>
                  {active ? (
                    <div className="mt-1.5 max-w-xs">
                      <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full bg-neutral-800 transition-[width] duration-150 ease-out ${
                            pct == null ? "w-1/3 animate-pulse" : ""
                          }`}
                          style={pct != null ? { width: `${pct}%` } : undefined}
                        />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums tracking-wide text-neutral-500">
                        {pct != null ? `${pct}% · ` : ""}
                        {progress.total && progress.total > 0
                          ? `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
                          : `${formatBytes(progress.loaded)}`}
                      </p>
                    </div>
                  ) : null}
                  {isError ? (
                    <p className="mt-1 text-[11.5px] tracking-wide text-red-600">
                      Download failed. Try again.
                    </p>
                  ) : null}
                </td>
                <td className="px-2.5 py-2.5 text-right sm:px-3">
                  <button
                    type="button"
                    disabled={blocked || active}
                    onClick={() => void onDownload(item)}
                    className="inline-flex h-8 min-w-[5.75rem] items-center justify-center rounded-md bg-neutral-900 px-2.5 text-[12.5px] font-medium tracking-wide text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    {active
                      ? pct != null
                        ? `${pct}%`
                        : "…"
                      : isDone
                        ? "Done"
                        : "Download"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
