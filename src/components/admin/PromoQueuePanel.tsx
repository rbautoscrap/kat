"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  approvePromoAction,
  publishApprovedTelegramBatchAction,
  publishPromoTelegramAction,
  recordPromoPostedAction,
  refillPromoQueueAction,
  skipPromoAction,
  updatePromoDraftAction,
} from "@/app/admin/promo-actions";
import { formatKoreaDateTime } from "@/lib/format-korea-time";
import {
  PROMO_CHANNEL_KEYS,
  PROMO_CHANNEL_LABELS,
  parseChannelResults,
  type PromoChannelKey,
} from "@/lib/promo-channel-results";

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
  channelResults: string | null;
  approvedAt: string | Date | null;
  postedAt: string | Date | null;
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
  telegramConfigured: boolean;
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
  telegramConfigured,
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
      refreshMessage("승인됨 — n8n 또는 아래 채널 결과로 기록");
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

  function record(
    id: string,
    channels: Record<string, { ok: boolean; url?: string; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await recordPromoPostedAction({ id, channels });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage("채널별 게시 결과 저장");
    });
  }

  function publishTelegram(id: string) {
    startTransition(async () => {
      const result = await publishPromoTelegramAction(id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage(result.detail || "Telegram 게시됨");
    });
  }

  function publishTelegramBatch() {
    startTransition(async () => {
      const result = await publishApprovedTelegramBatchAction();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      refreshMessage(
        `Telegram 게시 ${result.posted ?? 0}건` +
          (result.failed ? ` · 실패 ${result.failed}건` : ""),
      );
    });
  }

  const drafts = rows.filter((r) => r.status === "DRAFT");
  const approved = rows.filter((r) => r.status === "APPROVED");
  const posted = rows.filter((r) => r.status === "POSTED");
  const skipped = rows.filter((r) => r.status === "SKIPPED");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            SNS 홍보 큐
          </h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-neutral-500">
            고액·장기 재고 초안 → 승인 → <strong>Telegram 지금 게시</strong>로
            바로 올립니다. Instagram·Facebook·X는 URL을 아래에 기록합니다.
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
            Telegram:{" "}
            {telegramConfigured ? (
              <span className="font-medium text-emerald-700">연결됨 — 아래 버튼으로 게시</span>
            ) : (
              <span className="font-medium text-amber-800">
                Railway Variables에 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 필요
              </span>
            )}
          </p>
          <p className="mt-1 text-neutral-500">
            n8n 선택: GET{" "}
            <code className="rounded bg-white px-1">{webhookPath}</code> ·
            헤더 <code className="rounded bg-white px-1">x-promo-secret</code>
            {secretConfigured ? "" : " (AUTH_SECRET)"}
          </p>
        </div>
      </div>

      <Section title={`초안 ${drafts.length}`}>
        {drafts.length === 0 ? (
          <Empty>초안 없음</Empty>
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
                <Btn pending={pending} onClick={() => save(row.id)}>
                  저장
                </Btn>
                <Btn pending={pending} onClick={() => approve(row.id)} primary>
                  승인
                </Btn>
                <Btn pending={pending} onClick={() => skip(row.id)}>
                  제외
                </Btn>
              </div>
            </Card>
          ))
        )}
      </Section>

      <Section
        title={`승인·게시대기 ${approved.length}`}
        action={
          approved.length > 0 ? (
            <Btn
              pending={pending}
              primary
              onClick={publishTelegramBatch}
            >
              대기분 Telegram 10건 게시
            </Btn>
          ) : null
        }
      >
        {approved.length === 0 ? (
          <Empty>승인된 항목 없음</Empty>
        ) : (
          approved.map((row) => (
            <Card key={row.id} row={row}>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                승인 {formatKoreaDateTime(row.approvedAt)}
              </p>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-700">
                {row.body}
              </pre>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn
                  pending={pending}
                  primary
                  onClick={() => publishTelegram(row.id)}
                >
                  Telegram 지금 게시
                </Btn>
                <Btn pending={pending} onClick={() => skip(row.id)}>
                  제외
                </Btn>
              </div>
              <ChannelResultForm
                pending={pending}
                onSave={(channels) => record(row.id, channels)}
                compact
              />
            </Card>
          ))
        )}
      </Section>

      <Section title={`게시 결과 ${posted.length}`}>
        {posted.length === 0 ? (
          <Empty>아직 채널 게시 결과 없음 — 승인 후 n8n 또는 직접 기록</Empty>
        ) : (
          posted.slice(0, 40).map((row) => (
            <Card key={row.id} row={row}>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                승인 {formatKoreaDateTime(row.approvedAt)} · 게시{" "}
                {formatKoreaDateTime(row.postedAt)}
              </p>
              <ChannelResultView raw={row.channelResults} />
              <ChannelResultForm
                pending={pending}
                onSave={(channels) => record(row.id, channels)}
                compact
              />
            </Card>
          ))
        )}
      </Section>

      <Section title={`제외 ${skipped.length}`}>
        {skipped.length === 0 ? (
          <Empty>없음</Empty>
        ) : (
          skipped.slice(0, 15).map((row) => (
            <Card key={row.id} row={row} compact />
          ))
        )}
      </Section>
    </div>
  );
}

function ChannelResultView({ raw }: { raw: string | null }) {
  const results = parseChannelResults(raw);
  const keys = PROMO_CHANNEL_KEYS.filter((k) => results[k]);
  if (!keys.length) {
    return (
      <p className="mt-2 text-[12px] text-amber-700">
        게시됨으로 표시됐으나 채널별 상세가 없습니다.
      </p>
    );
  }
  return (
    <ul className="mt-2 divide-y divide-[var(--line)] rounded-md border border-[var(--line)]">
      {keys.map((key) => {
        const row = results[key]!;
        return (
          <li
            key={key}
            className="flex flex-wrap items-baseline justify-between gap-2 px-2.5 py-1.5 text-[12px]"
          >
            <span className="font-medium text-neutral-800">
              {PROMO_CHANNEL_LABELS[key]}{" "}
              <span className={row.ok ? "text-emerald-700" : "text-red-700"}>
                {row.ok ? "성공" : "실패"}
              </span>
            </span>
            <span className="tabular-nums text-neutral-500">
              {formatKoreaDateTime(row.at)}
            </span>
            {row.url ? (
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="basis-full text-sky-700 hover:underline"
              >
                {row.url}
              </a>
            ) : null}
            {!row.ok && row.error ? (
              <span className="basis-full text-red-600">{row.error}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ChannelResultForm({
  pending,
  onSave,
  onSkip,
  compact,
}: {
  pending: boolean;
  onSave: (
    channels: Record<string, { ok: boolean; url?: string; error?: string }>,
  ) => void;
  onSkip?: () => void;
  compact?: boolean;
}) {
  const [ok, setOk] = useState<Record<PromoChannelKey, boolean>>({
    telegram: true,
    instagram: true,
    facebook: true,
    x: true,
  });
  const [urls, setUrls] = useState<Partial<Record<PromoChannelKey, string>>>(
    {},
  );

  return (
    <div className={`space-y-2 ${compact ? "mt-2" : "mt-3"}`}>
      {!compact ? (
        <p className="text-[11.5px] font-medium text-neutral-600">
          채널별 결과 기록
        </p>
      ) : (
        <p className="text-[11.5px] text-neutral-500">결과 추가·수정</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {PROMO_CHANNEL_KEYS.map((key) => (
          <label
            key={key}
            className="flex flex-col gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-[12px]"
          >
            <span className="flex items-center gap-2 font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={ok[key]}
                onChange={(e) =>
                  setOk((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
              {PROMO_CHANNEL_LABELS[key]} {ok[key] ? "성공" : "실패"}
            </span>
            <input
              value={urls[key] ?? ""}
              onChange={(e) =>
                setUrls((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder="게시 URL (선택)"
              className="h-7 rounded border border-neutral-200 px-2 text-[11.5px]"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Btn
          pending={pending}
          primary
          onClick={() => {
            const channels: Record<
              string,
              { ok: boolean; url?: string; error?: string }
            > = {};
            for (const key of PROMO_CHANNEL_KEYS) {
              channels[key] = {
                ok: ok[key],
                url: urls[key]?.trim() || undefined,
                error: ok[key] ? undefined : "게시 실패",
              };
            }
            onSave(channels);
          }}
        >
          게시 결과 저장
        </Btn>
        {onSkip ? (
          <Btn pending={pending} onClick={onSkip}>
            제외
          </Btn>
        ) : null}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  pending,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  pending: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`h-8 rounded-md px-2.5 text-[12px] disabled:opacity-50 ${
        primary
          ? "bg-emerald-700 font-medium text-white"
          : "border border-neutral-300 bg-white text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="px-4 sm:px-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-neutral-800">{title}</h3>
        {action}
      </div>
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
  children?: ReactNode;
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
