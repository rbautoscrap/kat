"use client";

import { useState, type MouseEvent } from "react";

type Props = {
  imageId: string;
  className?: string;
  iconClassName?: string;
};

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 4v11"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M7.5 11.5 12 16l4.5-4.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.5h14"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`animate-spin ${className ?? ""}`}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity="0.25"
      />
      <path
        d="M20 12a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadPhotoButton({
  imageId,
  className,
  iconClassName = "h-4 w-4",
}: Props) {
  const [pending, setPending] = useState(false);

  async function onDownload(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(
        `/api/images/download?id=${encodeURIComponent(imageId)}`,
      );
      if (!res.ok) {
        window.alert("Could not download the photo. Please try again.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "photo.jpg";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      /* ignore — original photos stay protected */
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      data-allow-image-download=""
      onClick={onDownload}
      disabled={pending}
      aria-label="Download photo"
      title="Download photo"
      className={
        className ??
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow-sm transition hover:bg-black/80 disabled:opacity-70"
      }
    >
      {pending ? (
        <SpinnerIcon className={iconClassName} />
      ) : (
        <DownloadIcon className={iconClassName} />
      )}
    </button>
  );
}
