"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  approvePromoAction,
  refillPromoQueueAction,
  skipPromoAction,
  updatePromoDraftAction,
} from "@/app/admin/promo-actions";

type Row = {
  id: string;
  status: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  listingUrl: string;
  costWon: number;
  ageDays: number;
  channels: string;
  listing: {
    serialNumber: string;
    year: number;
    make: string;
    model: string;
    saleStatus: string;
  };
};

type Props = {
  rows: Row[];
  webhookPath: string;
  secretConfigured: boolean;
};

const statusLabel: Record<string, string> = {
  DRAFT: "초안",
  APPROVED: "승인·게시대기",
  POSTED: "게시됨",
  SKIPPED: "제외",
};

export function PromoQueuePanel({
  rows,
  webhookPath,
  secretConfigured,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { body: string }>>({});

  function refreshMessage(text: string) {
    setMessage(text);
    router.refresh();
  }

  function refill() {
    startTransition(async () => {
      const result = await refillPromoQueueAction();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage(`초안 ${result.created ?? 0}건 추가`);
    });
  }

  function save(id: string) {
    const body = edits[id]?.body;
    startTransition(async () => {
      const result = await updatePromoDraftAction({ id, body });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage("초안 저장");
    });
  }

  function approve(id: string) {
    startTransition(async () => {
      const result = await approvePromoAction(id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage("승인됨 — n8n이 가져갑니다");
    });
  }

  function skip(id: string) {
    startTransition(async () => {
      const result = await skipPromoAction(id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage("제외됨");
    });
  }

  const drafts = rows.filter((r) => r.status === "DRAFT");
  const approved = rows.filter((r) => r.status === "APPROVED");
  const done = rows.filter(
    (r) => r.status === "POSTED" || r.status === "SKIPPED",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            SNS 홍보 큐
          </h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-neutral-500">
            고액(300만원↑) 또는 장기재고(30일↑) 판매중 매물을 골라 영문 초안을
            만듭니다. 승인 후 n8n이 Telegram·Instagram·Facebook·X로 게시합니다.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={refill}
          className="h-9 rounded-md bg-neutral-900 px-3.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "처리 중…" : "재고에서 초안 채우기"}
        </button>
      </div>

      <div className="space-y-2 px-4 sm:px-5">
        {message ? (
          <p className="text-[12.5px] text-sky-800">{message}</p>
        ) : null}
        <div className="rounded-sm border border-[var(--line)] bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-600">
          <p>
            n8n GET{" "}
            <code className="rounded bg-white px-1">{webhookPath}</code>
            {" · "}
            헤더 <code className="rounded bg-white px-1">x-promo-secret</code>
            {secretConfigured ? " (서버 시크릿 설정됨)" : " (AUTH_SECRET 사용)"}
          </p>
          <p className="mt-1">
            게시 후 POST 동일 URL · body{" "}
            <code className="rounded bg-white px-1">{`{"ids":["…"]}`}</code>
          </p>
        </div>
      </div>

      <Section title={`초안 ${drafts.length}`}>
        {drafts.length === 0 ? (
          <Empty>초안 없음 — 위에서 채우기</Empty>
        ) : (
          drafts.map((row) => (
            <Card key={row.id} row={row}>
              <textarea
                className="mt-2 h-28 w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-[12.5px] text-neutral-800"
                value={edits[row.id]?.body ?? row.body}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [row.id]: { body: e.target.value },
                  }))
                }
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => save(row.id)}
                  className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px]"
                >
                  저장
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => approve(row.id)}
                  className="h-8 rounded-md bg-emerald-700 px-2.5 text-[12px] font-medium text-white"
                >
                  승인
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => skip(row.id)}
                  className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px] text-neutral-600"
                >
                  제외
                </button>
              </div>
            </Card>
          ))
        )}
      </Section>

      <Section title={`승인·게시대기 ${approved.length}`}>
        {approved.length === 0 ? (
          <Empty>승인된 항목 없음</Empty>
        ) : (
          approved.map((row) => (
            <Card key={row.id} row={row}>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-700">
                {row.body}
              </pre>
              <button
                type="button"
                disabled={pending}
                onClick={() => skip(row.id)}
                className="mt-2 h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px]"
              >
                제외
              </button>
            </Card>
          ))
        )}
      </Section>

      <Section title={`최근 처리 ${done.length}`}>
        {done.length === 0 ? (
          <Empty>없음</Empty>
        ) : (
          done.slice(0, 20).map((row) => (
            <Card key={row.id} row={row} compact />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="px-4 sm:px-5">
      <h3 className="mb-2 text-[13px] font-semibold text-neutral-800">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-sm border border-dashed border-neutral-200 px-3 py-4 text-[12.5px] text-neutral-500">
      {children}
    </p>
  );
}

function Card({
  row,
  children,
  compact,
}: {
  row: Row;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <article className="rounded-sm border border-[var(--line)] bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-neutral-900">
          [{row.listing.serialNumber}] {row.headline}
        </p>
        <p className="text-[11.5px] tabular-nums text-neutral-500">
          {statusLabel[row.status] ?? row.status} · 원가{" "}
          {row.costWon.toLocaleString("ko-KR")} · {row.ageDays}일
        </p>
      </div>
      {!compact ? (
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          <a
            href={row.listingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sky-700 hover:underline"
          >
            매물 보기
          </a>
          {" · "}
          {row.channels}
        </p>
      ) : null}
      {children}
    </article>
  );
}
