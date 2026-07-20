"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { deleteStatement } from "@/app/admin/statement-actions";
import {
  adminActionBtnClass,
  adminDangerBtnClass,
} from "@/lib/admin-ui";

type Props = {
  statementId: string;
  statementNo: string;
};

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
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${statementNo}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      setMessage("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
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
