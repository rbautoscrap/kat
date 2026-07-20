"use client";

import { useState } from "react";
import { StatementDocument } from "@/components/admin/StatementDocument";
import type { StatementLocale, StatementView } from "@/lib/statement";
import { adminActionBtnClass } from "@/lib/admin-ui";

type Props = {
  statement: StatementView;
};

export function StatementPreviewPanel({ statement }: Props) {
  const [locale, setLocale] = useState<StatementLocale>("ko");

  return (
    <div className="statement-print-root rounded-sm border border-[var(--line)] bg-neutral-100 p-3 sm:p-5">
      <div className="statement-no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] tracking-wide text-neutral-500">
          {locale === "ko"
            ? "미리보기 · 영문 버전은 외국인 바이어 전달용입니다."
            : "Preview · English version for overseas buyers."}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`${adminActionBtnClass} ${
              locale === "ko"
                ? "!border-neutral-800 !bg-neutral-900 !text-white"
                : ""
            }`}
            onClick={() => setLocale("ko")}
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
          >
            English
          </button>
        </div>
      </div>
      <StatementDocument
        key={locale}
        statement={statement}
        locale={locale}
      />
    </div>
  );
}
