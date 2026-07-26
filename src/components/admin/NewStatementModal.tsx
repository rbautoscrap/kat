"use client";

import { useState } from "react";
import { AuthModalShell } from "@/components/AuthModalShell";
import { StatementForm } from "@/components/admin/StatementForm";
import type { ListingOption, MemberOption } from "@/lib/statement";

type Props = {
  listings: ListingOption[];
  members: MemberOption[];
  defaultIssueDate: string;
};

export function NewStatementModal({
  listings,
  members,
  defaultIssueDate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white transition hover:bg-neutral-700"
      >
        + 새 명세서
      </button>
      <AuthModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="거래명세서 작성"
        maxWidthClass="max-w-2xl"
        closeLabel="닫기"
        closeOnBackdrop={false}
        closeButtonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-red-50 hover:text-red-700"
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
          거래명세서 작성
        </h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          매물을 선택하고, 가능하면 가입 회원을 연결해 주세요.
        </p>
        <div className="mt-5">
          {listings.length === 0 ? (
            <p className="text-[13.5px] text-neutral-500">
              등록된 매물이 없습니다. 먼저 매물을 등록해 주세요.
            </p>
          ) : (
            <StatementForm
              mode="create"
              listings={listings}
              members={members}
              defaultIssueDate={defaultIssueDate}
              onCancel={() => setOpen(false)}
            />
          )}
        </div>
      </AuthModalShell>
    </>
  );
}
