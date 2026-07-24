"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserAdminNote } from "@/app/admin/actions";

type Props = {
  userId: string;
  userName: string;
  note: string | null;
};

export function UserAdminNoteButton({ userId, userName, note }: Props) {
  const router = useRouter();
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasNote = Boolean(note?.trim());
  const preview = note?.trim() ?? "";

  useEffect(() => {
    if (!open) return;
    setDraft(note ?? "");
    setError(null);
    const t = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, note]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAdminNote(userId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={hasNote ? preview : "비고 작성"}
        className={`max-w-full truncate text-left text-[12.5px] transition ${
          hasNote
            ? "font-medium text-sky-800 hover:text-sky-950"
            : "text-neutral-400 hover:text-neutral-600"
        }`}
      >
        {hasNote ? preview : "메모 추가"}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
          >
            <div className="border-b border-neutral-100 px-5 py-4">
              <h3
                id={titleId}
                className="text-[15px] font-semibold tracking-tight text-neutral-900"
              >
                회원 비고
              </h3>
              <p className="mt-1 truncate text-[13px] text-neutral-500">
                {userName}
                <span className="text-neutral-300"> · </span>
                관리자만 볼 수 있는 내부 메모입니다.
              </p>
            </div>

            <div className="px-5 py-4">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                maxLength={2000}
                disabled={pending}
                placeholder="다른 관리자와 공유할 메모를 적어 주세요."
                className="w-full resize-y rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-2.5 text-[13.5px] leading-relaxed text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white disabled:opacity-60"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[12px] text-neutral-400">
                  {draft.length.toLocaleString("ko-KR")} / 2,000
                </p>
                {error ? (
                  <p className="text-[12.5px] text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50/80 px-5 py-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="inline-flex h-8 items-center rounded-md px-3 text-[12.5px] font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={save}
                className="inline-flex h-8 items-center rounded-md bg-neutral-800 px-3 text-[12.5px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
