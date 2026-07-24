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

type JobPhase =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "downloading"; name: string; loaded: number; total: number | null }
  | { kind: "restoring"; detail?: string };

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

/** Fetch a backup ZIP once as a blob (avoids duplicate browser downloads). */
async function downloadBackupOnce(
  name: string,
  onProgress: (loaded: number, total: number | null) => void,
) {
  const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("다운로드에 실패했습니다.");
  }

  const totalHeader = res.headers.get("Content-Length");
  const total = totalHeader ? Number(totalHeader) : null;
  const usableTotal =
    total != null && Number.isFinite(total) && total > 0 ? total : null;

  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    onProgress(blob.size, blob.size);
    triggerBlobDownload(blob, name);
    return;
  }

  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, usableTotal);
    }
  }
  const blob = new Blob(chunks, { type: "application/zip" });
  onProgress(blob.size, usableTotal ?? blob.size);
  triggerBlobDownload(blob, name);
}

export function BackupPanel({ initialBackups }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const createLockRef = useRef(false);
  const downloadLockRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<JobPhase>({ kind: "idle" });
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [restoringName, setRestoringName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const busy =
    phase.kind !== "idle" ||
    Boolean(deletingName) ||
    Boolean(restoringName);

  function describeRestore(json: RestoreJson) {
    const r = json.restored;
    if (!r) return "복원이 완료되었습니다.";
    return `복원이 완료되었습니다. (매물 ${r.listings} · 회원 ${r.users} · 이미지 파일 ${r.uploadsFiles})`;
  }

  async function runDownload(name: string) {
    if (downloadLockRef.current) return;
    downloadLockRef.current = name;
    setError(null);
    setPhase({ kind: "downloading", name, loaded: 0, total: null });
    try {
      await downloadBackupOnce(name, (loaded, total) => {
        setPhase({ kind: "downloading", name, loaded, total });
      });
      setMessage(`다운로드를 시작했습니다. (${name})`);
    } catch {
      setError("다운로드 중 오류가 발생했습니다.");
    } finally {
      downloadLockRef.current = null;
      setPhase({ kind: "idle" });
    }
  }

  async function onCreate() {
    if (createLockRef.current || busy) return;
    createLockRef.current = true;
    setError(null);
    setMessage(null);
    setPhase({ kind: "creating" });
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
        setPhase({ kind: "idle" });
        return;
      }

      setMessage(`백업이 생성되었습니다. (${json.backup.name}) PC로 받는 중…`);
      router.refresh();

      // Single blob download — do not also open a raw <a href> to the API
      // (that combo can make Chrome save the same ZIP twice).
      await runDownload(json.backup.name);
    } catch {
      setError("백업 요청 중 네트워크 오류가 발생했습니다.");
      setPhase({ kind: "idle" });
    } finally {
      createLockRef.current = false;
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
    setPhase({ kind: "restoring", detail: name });
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
      setPhase({ kind: "idle" });
    }
  }

  async function onRestoreUpload(file: File) {
    if (
      !window.confirm(
        `"${file.name}" 파일로 복원할까요?\n\n현재 서버의 데이터베이스와 업로드 이미지가 이 ZIP 내용으로 교체됩니다.\n대용량 파일은 Railway로 직접 업로드됩니다.`,
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setPhase({ kind: "restoring", detail: "ZIP 업로드" });
    try {
      const ticketRes = await fetch("/api/admin/backups/restore-ticket", {
        method: "POST",
        credentials: "same-origin",
      });
      const ticketJson = (await ticketRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        ticket?: string;
        uploadUrl?: string;
        viaRailway?: boolean;
      };
      if (
        !ticketRes.ok ||
        !ticketJson.ok ||
        !ticketJson.uploadUrl ||
        !ticketJson.ticket
      ) {
        setError(ticketJson.error ?? "복원 업로드 주소를 준비하지 못했습니다.");
        return;
      }

      if (ticketJson.viaRailway) {
        setMessage(
          "Railway로 직접 업로드·복원 중입니다. 완료까지 기다려 주세요…",
        );
      }

      const body = new FormData();
      body.set("file", file);
      const res = await fetch(ticketJson.uploadUrl, {
        method: "POST",
        body,
        headers: { "X-Kat-Restore-Ticket": ticketJson.ticket },
        mode: ticketJson.viaRailway ? "cors" : "same-origin",
        credentials: "omit",
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
        "복원 업로드 중 오류가 발생했습니다. Railway 공개 도메인이 연결돼 있는지 확인해 주세요.",
      );
    } finally {
      setPhase({ kind: "idle" });
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const downloadPct =
    phase.kind === "downloading" && phase.total && phase.total > 0
      ? Math.min(100, Math.round((phase.loaded / phase.total) * 100))
      : null;

  return (
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="admin-section-head">
          <div className="admin-section-head-text">
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              백업
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              데이터베이스와 업로드 이미지를 Railway 볼륨에 ZIP으로 저장·복원합니다.
              대용량 ZIP 복원은 Cloudflare를 거치지 않고 Railway로 직접 업로드됩니다.
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
              {phase.kind === "restoring" && !restoringName
                ? "복원 중…"
                : "ZIP으로 복원"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreate()}
              className="inline-flex h-8 items-center rounded-md bg-neutral-800 px-3 text-[12.5px] font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {phase.kind === "creating"
                ? "백업 생성 중…"
                : phase.kind === "downloading"
                  ? "다운로드 중…"
                  : "지금 백업"}
            </button>
          </div>
        </div>

        {phase.kind === "creating" ? (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <p className="text-[13px] font-medium text-neutral-800">
              서버에서 백업 ZIP을 만드는 중입니다…
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-neutral-700" />
            </div>
            <p className="mt-1.5 text-[12px] text-neutral-500">
              용량이 크면 1~수 분 걸릴 수 있습니다. 창을 닫지 마세요.
            </p>
          </div>
        ) : null}

        {phase.kind === "downloading" ? (
          <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium text-sky-950">
                PC로 다운로드 중…
              </p>
              <p className="text-[12px] tabular-nums text-sky-800/90">
                {downloadPct != null
                  ? `${downloadPct}%`
                  : formatBytes(phase.loaded)}
                {phase.total ? ` / ${formatBytes(phase.total)}` : ""}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-[width] duration-200"
                style={{
                  width:
                    downloadPct != null
                      ? `${downloadPct}%`
                      : phase.loaded > 0
                        ? "35%"
                        : "8%",
                }}
              />
            </div>
            <p className="mt-1.5 truncate text-[12px] text-sky-800/80">
              {phase.name}
            </p>
          </div>
        ) : null}

        {phase.kind === "restoring" ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[13px] font-medium text-amber-950">
              복원 작업 진행 중…
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-amber-600" />
            </div>
            {phase.detail ? (
              <p className="mt-1.5 truncate text-[12px] text-amber-900/80">
                {phase.detail}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-[13px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message && phase.kind === "idle" ? (
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
                const downloadingThis =
                  phase.kind === "downloading" && phase.name === backup.name;
                return (
                  <tr key={backup.name}>
                    <td
                      className={`${adminTdClass} truncate`}
                      title={backup.name}
                    >
                      {backup.name}
                    </td>
                    <td
                      className={`${adminTdClass} whitespace-nowrap text-neutral-600`}
                    >
                      <span className="tabular-nums">
                        {formatKoreaDateTime(backup.createdAt)}
                      </span>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      <span className="tabular-nums">{backup.sizeLabel}</span>
                    </td>
                    <td className={`${adminTdActionsClass} admin-td-actions`}>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runDownload(backup.name)}
                          className={adminActionBtnClass}
                        >
                          {downloadingThis ? "받는 중…" : "다운로드"}
                        </button>
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
