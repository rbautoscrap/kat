"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListingAdminNote } from "@/app/admin/actions";

type Props = {
  listingId: string;
  note: string | null;
};

export function AdminListingMemo({ listingId, note }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(note ?? "");
  }, [note]);

  const dirty = draft.trim() !== (note ?? "").trim();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateListingAdminNote(listingId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 border-t border-amber-200/80 pt-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={`listing-admin-note-${listingId}`}
          className="text-[12.5px] font-medium tracking-wide text-amber-900/80"
        >
          관리자 메모
        </label>
        <p className="text-[11px] tabular-nums text-amber-900/55">
          {draft.length.toLocaleString("ko-KR")} / 2,000
        </p>
      </div>
      <textarea
        id={`listing-admin-note-${listingId}`}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        rows={3}
        maxLength={2000}
        disabled={pending}
        placeholder="관리자만 보고 수정할 수 있습니다. 회원·일반 고객에게는 보이지 않습니다."
        className="w-full resize-y rounded-sm border border-amber-200 bg-white/80 px-2.5 py-2 text-[13px] leading-relaxed text-neutral-800 outline-none transition placeholder:text-amber-900/35 focus:border-amber-400 focus:bg-white disabled:opacity-60"
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="min-h-[1.2em] text-[12px]" role={error ? "alert" : undefined}>
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : saved && !dirty ? (
            <span className="text-amber-900/70">저장되었습니다.</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex h-7 items-center rounded-md bg-amber-900 px-2.5 text-[12px] font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "저장 중…" : "메모 저장"}
        </button>
      </div>
    </div>
  );
}
