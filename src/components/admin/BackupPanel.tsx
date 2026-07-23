"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { BackupInfo } from "@/lib/maintenance";
import { formatKoreaDateTime } from "@/lib/format-korea-time";
import {
  adminActionBtnClass,
  adminDangerBtnClass,
  adminTableClass,
  adminTableScrollClass,
  adminTdActionsClass,
  adminTdClass,
  adminThClass,
} from "@/lib/admin-ui";

type Props = {
  initialBackups: BackupInfo[];
};

type RestoreJson = {
  ok?: boolean;
  error?: string;
  restored?: { listings: number; users: number; uploadsFiles: number };
};

export function BackupPanel({ initialBackups }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [restoringName, setRestoringName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function describeRestore(json: RestoreJson) {
    const r = json.restored;
    if (!r) return "복원이 완료되었습니다.";
    return `복원이 완료되었습니다. (매물 ${r.listings} · 회원 ${r.users} · 이미지 파일 ${r.uploadsFiles})`;
  }

  async function onCreate() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        backup?: BackupInfo;
      };

      if (!res.ok || !json.ok || !json.backup) {
        setError(json.error ?? "백업 생성에 실패했습니다.");
        return;
      }

      setMessage(`백업이 생성되었습니다. (${json.backup.name})`);
      router.refresh();

      const link = document.createElement("a");
      link.href = `/api/admin/backups/${encodeURIComponent(json.backup.name)}`;
      link.download = json.backup.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("백업 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(name: string) {
    if (
      !window.confirm(
        `"${name}" 백업을 완전히 삭제할까요?\n삭제 후에는 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setDeletingName(name);
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "백업 삭제에 실패했습니다.");
        return;
      }
      setMessage("백업이 삭제되었습니다.");
      router.refresh();
    } catch {
      setError("삭제 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingName(null);
    }
  }

  async function onRestoreServer(name: string) {
    if (
      !window.confirm(
        `"${name}" 백업으로 복원할까요?\n\n현재 서버의 데이터베이스와 업로드 이미지가 이 백업 내용으로 교체됩니다.`,
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setRestoringName(name);
    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as RestoreJson;
      if (!res.ok || !json.ok) {
        setError(json.error ?? "복원에 실패했습니다.");
        return;
      }
      setMessage(describeRestore(json));
      router.refresh();
    } catch {
      setError("복원 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setRestoringName(null);
    }
  }

  async function onRestoreUpload(file: File) {
    if (
      !window.confirm(
        `"${file.name}" 파일로 복원할까요?\n\n현재 서버의 데이터베이스와 업로드 이미지가 이 ZIP 내용으로 교체됩니다.\n파일 크기에 따라 수 분 걸릴 수 있습니다.`,
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setRestoring(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const json = (await res.json().catch(() => ({}))) as RestoreJson;
      if (!res.ok || !json.ok) {
        setError(json.error ?? "복원에 실패했습니다.");
        return;
      }
      setMessage(describeRestore(json));
      router.refresh();
    } catch {
      setError(
        "복원 업로드 중 오류가 발생했습니다. 파일이 매우 크면 네트워크/프록시 제한으로 실패할 수 있습니다.",
      );
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy =
    pending || restoring || Boolean(deletingName) || Boolean(restoringName);

  return (
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="admin-section-head">
          <div className="admin-section-head-text">
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              백업
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              데이터베이스와 업로드 이미지를 ZIP으로 저장·복원합니다. 최근 5개까지
              보관됩니다.
            </p>
          </div>
          <div className="admin-section-head-actions flex flex-wrap items-center justify-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onRestoreUpload(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-[12.5px] font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {restoring ? "복원 중…" : "ZIP으로 복원"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreate()}
              className="inline-flex h-8 items-center rounded-md bg-neutral-800 px-3 text-[12.5px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {pending ? "백업 중…" : "지금 백업"}
            </button>
          </div>
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
        <p className="px-5 py-10 text-center text-[13.5px] text-neutral-500">
          아직 생성된 백업이 없습니다. 디스크에 보관 중인 ZIP은 「ZIP으로 복원」으로
          올릴 수 있습니다.
        </p>
      ) : (
        <div className={adminTableScrollClass}>
          <table className={`${adminTableClass} min-w-[720px]`}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className={adminThClass}>파일명</th>
                <th className={adminThClass}>생성·용량</th>
                <th className={`${adminThClass} admin-th-actions text-right`}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {initialBackups.map((backup) => {
                const deleting = deletingName === backup.name;
                const restoringThis = restoringName === backup.name;
                return (
                  <tr key={backup.name}>
                    <td className={`${adminTdClass} truncate`} title={backup.name}>
                      {backup.name}
                    </td>
                    <td className={`${adminTdClass} whitespace-nowrap text-neutral-600`}>
                      <span className="tabular-nums">
                        {formatKoreaDateTime(backup.createdAt)}
                      </span>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      <span className="tabular-nums">{backup.sizeLabel}</span>
                    </td>
                    <td className={`${adminTdActionsClass} admin-td-actions`}>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <a
                          href={`/api/admin/backups/${encodeURIComponent(backup.name)}`}
                          className={adminActionBtnClass}
                        >
                          다운로드
                        </a>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onRestoreServer(backup.name)}
                          className={adminActionBtnClass}
                        >
                          {restoringThis ? "복원 중…" : "복원"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(backup.name)}
                          className={adminDangerBtnClass}
                        >
                          {deleting ? "삭제 중…" : "삭제"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
