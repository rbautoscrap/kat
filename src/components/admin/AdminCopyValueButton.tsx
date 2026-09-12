"use client";

import { useState } from "react";

type Props = {
  value: string;
  label: string;
};

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function AdminCopyValueButton({ value, label }: Props) {
  const [copied, setCopied] = useState(false);
  const text = value.trim();
  if (!text) return null;

  async function onCopy() {
    const ok = await writeClipboard(text);
    if (!ok) {
      window.prompt(`${label}을(를) 복사해 주세요.`, text);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? `${label} 저장됨` : `${label} 저장`}
      aria-label={copied ? `${label} 저장됨` : `${label} 저장`}
      className="admin-copy-value"
    >
      {copied ? <CheckIcon /> : <SaveIcon />}
    </button>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3.5 w-3.5">
      <path
        d="M6.4 4.6h9.2L19.4 8.4v11h-14.8V4.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 4.6v4.6h7.4V4.6M8.2 19.4v-5.4h7.6v5.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3.5 w-3.5">
      <path
        d="M6.4 12.2 10.2 16l7.4-8.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
