"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runMaintenanceBackup } from "@/app/admin/maintenance-actions";
import type { BackupInfo } from "@/lib/maintenance";

type Props = {
  initialBackups: BackupInfo[];
};

export function BackupPanel({ initialBackups }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onCreate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await runMaintenanceBackup();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`백업이 생성되었습니다. (${result.backup.name})`);
      router.refresh();
      const link = document.createElement("a");
      link.href = `/api/admin/backups/${encodeURIComponent(result.backup.name)}`;
      link.download = result.backup.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  return (
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              백업
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              데이터베이스와 업로드 이미지를 ZIP으로 저장합니다. 최근 5개까지
              보관됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onCreate}
            className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {pending ? "백업 중…" : "지금 백업"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-[13px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-[13px] text-emerald-700">{message}</p>
        ) : null}
      </div>

      {initialBackups.length === 0 ? (
        <p className="px-5 py-8 text-[13.5px] text-neutral-500">
          아직 생성된 백업이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {initialBackups.map((backup) => (
            <li
              key={backup.name}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-neutral-800">
                  {backup.name}
                </p>
                <p className="mt-0.5 text-[12.5px] text-neutral-500">
                  {backup.createdAt.slice(0, 19).replace("T", " ")} UTC ·{" "}
                  {backup.sizeLabel}
                </p>
              </div>
              <a
                href={`/api/admin/backups/${encodeURIComponent(backup.name)}`}
                className="inline-flex h-8 items-center rounded-md border border-neutral-200 bg-white px-3 text-[12.5px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                다운로드
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
