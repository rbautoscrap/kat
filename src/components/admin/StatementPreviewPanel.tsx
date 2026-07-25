"use client";

import { useState } from "react";
import { StatementDocument } from "@/components/admin/StatementDocument";
import type { StatementLocale, StatementView } from "@/lib/statement";
import { adminActionBtnClass } from "@/lib/admin-ui";

/** A4-ish width at 96dpi — keeps layout identical on screen, print, and PNG */
const EXPORT_WIDTH_PX = 794;

type Props = {
  statement: StatementView;
};

function waitFrames(count = 2) {
  return new Promise<void>((resolve) => {
    const step = (n: number) => {
      if (n <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(n - 1));
    };
    step(count);
  });
}

/**
 * Capture via a short-lived on-screen layer.
 * Off-screen clones (left: -9999px) often export as blank white in Chromium.
 */
async function captureStatementPng(
  source: HTMLElement,
  toPng: typeof import("html-to-image").toPng,
): Promise<string> {
  await document.fonts.ready.catch(() => undefined);

  const layer = document.createElement("div");
  layer.setAttribute("data-statement-export-layer", "1");
  Object.assign(layer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${EXPORT_WIDTH_PX}px`,
    zIndex: "2147483646",
    background: "#ffffff",
    pointerEvents: "none",
    opacity: "1",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  Object.assign(clone.style, {
    width: `${EXPORT_WIDTH_PX}px`,
    maxWidth: `${EXPORT_WIDTH_PX}px`,
    minWidth: `${EXPORT_WIDTH_PX}px`,
    margin: "0",
    background: "#ffffff",
    transform: "none",
    opacity: "1",
  });

  layer.appendChild(clone);
  document.body.appendChild(layer);

  try {
    const images = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );
    await waitFrames(3);
    await new Promise((r) => setTimeout(r, 80));

    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 400);
    return await toPng(clone, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: EXPORT_WIDTH_PX,
      height,
      style: {
        width: `${EXPORT_WIDTH_PX}px`,
        maxWidth: `${EXPORT_WIDTH_PX}px`,
        transform: "none",
        opacity: "1",
      },
    });
  } finally {
    layer.remove();
  }
}

export function StatementPreviewPanel({ statement }: Props) {
  const [locale, setLocale] = useState<StatementLocale>("ko");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSaveImage() {
    const node = document.getElementById("statement-document");
    if (!node) {
      setMessage("문서 영역을 찾을 수 없습니다.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await captureStatementPng(node, toPng);
      if (!dataUrl || dataUrl.length < 200) {
        throw new Error("empty image data");
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${statement.statementNo}-${locale === "en" ? "EN" : "KO"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      setMessage(
        "이미지 저장에 실패했습니다. 잠시 후 다시 시도하거나 출력(인쇄)을 이용해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="statement-print-root rounded-sm border border-[var(--line)] bg-neutral-100 p-3 sm:p-5">
      <div className="statement-no-print mb-3 flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            className={`${adminActionBtnClass} ${
              locale === "ko"
                ? "!border-neutral-800 !bg-neutral-900 !text-white"
                : ""
            }`}
            onClick={() => setLocale("ko")}
            disabled={busy}
          >
            한국어
          </button>
          <button
            type="button"
            className={`${adminActionBtnClass} ${
              locale === "en"
                ? "!border-neutral-800 !bg-neutral-900 !text-white"
                : ""
            }`}
            onClick={() => setLocale("en")}
            disabled={busy}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={busy}
            className={adminActionBtnClass}
          >
            출력
          </button>
          <button
            type="button"
            onClick={onSaveImage}
            disabled={busy}
            className={adminActionBtnClass}
          >
            {busy ? "이미지 저장 중…" : "이미지 저장"}
          </button>
        </div>
      </div>
      {message ? (
        <p
          className="statement-no-print mb-3 text-right text-[13px] text-red-600"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <StatementDocument
        key={locale}
        statement={statement}
        locale={locale}
      />
    </div>
  );
}
