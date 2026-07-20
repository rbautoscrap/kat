"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { deleteStatement } from "@/app/admin/statement-actions";
import {
  adminActionBtnClass,
  adminDangerBtnClass,
} from "@/lib/admin-ui";

/** A4-ish width at 96dpi — keeps layout identical on screen, print, and PNG */
const EXPORT_WIDTH_PX = 794;

type Props = {
  statementId: string;
  statementNo: string;
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
async function captureStatementPng(source: HTMLElement): Promise<string> {
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

export function StatementActions({ statementId, statementNo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onPrint() {
    window.print();
  }

  async function onSaveImage() {
    const node = document.getElementById("statement-document");
    if (!node) {
      setMessage("문서 영역을 찾을 수 없습니다.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const dataUrl = await captureStatementPng(node);
      if (!dataUrl || dataUrl.length < 200) {
        throw new Error("empty image data");
      }

      const a = document.createElement("a");
      const locale =
        document
          .getElementById("statement-document")
          ?.getAttribute("data-locale") === "en"
          ? "EN"
          : "KO";
      a.href = dataUrl;
      a.download = `${statementNo}-${locale}.png`;
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

  function onDelete() {
    if (!confirm("이 거래명세서를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteStatement(statementId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push("/admin/statements");
      router.refresh();
    });
  }

  return (
    <div className="statement-no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={onPrint}
        disabled={busy || pending}
        className={adminActionBtnClass}
      >
        출력
      </button>
      <button
        type="button"
        onClick={onSaveImage}
        disabled={busy || pending}
        className={adminActionBtnClass}
      >
        {busy ? "이미지 저장 중…" : "이미지 저장"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy || pending}
        className={adminDangerBtnClass}
      >
        삭제
      </button>
      {message ? (
        <p className="w-full text-[13px] text-red-600" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
