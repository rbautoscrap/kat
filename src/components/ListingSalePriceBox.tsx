"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListingSalePrice } from "@/app/admin/actions";
import { AuthModalShell } from "@/components/AuthModalShell";
import { formatSalePriceDisplay } from "@/lib/listings";

type Props = {
  listingId?: string;
  salePrice?: string | null;
  krwLabel: string;
  usdLabel?: string | null;
  eurLabel?: string | null;
  canEdit?: boolean;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatWonInput(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <path d="M13.6 2.9a1.6 1.6 0 0 1 2.26 0l1.24 1.24a1.6 1.6 0 0 1 0 2.26l-9.2 9.2-3.3.8a.7.7 0 0 1-.84-.84l.8-3.3 9.04-9.36Zm1.27 1.0-1.18-1.18-1.1 1.14 1.18 1.18 1.1-1.14ZM4.7 13.16l-.4 1.54 1.54-.4 7.7-7.7-1.14-1.14-7.7 7.7Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <path d="M7.2 3.2h5.6l.35 1.1H16.5a.7.7 0 1 1 0 1.4h-.72l-.72 9.05A1.9 1.9 0 0 1 13.17 16.6H6.83a1.9 1.9 0 0 1-1.89-1.85L4.22 5.7H3.5a.7.7 0 1 1 0-1.4h3.35L7.2 3.2Zm.95 1.1-.2.6h4.1l-.2-.6H8.15ZM6.12 5.7l.71 8.9c.03.32.3.57.62.57h6.34c.32 0 .59-.25.62-.57l.71-8.9H6.12Zm2.13 1.7a.65.65 0 0 1 .65.65v5.1a.65.65 0 1 1-1.3 0v-5.1c0-.36.29-.65.65-.65Zm3.5 0c.36 0 .65.29.65.65v5.1a.65.65 0 1 1-1.3 0v-5.1c0-.36.29-.65.65-.65Z" />
    </svg>
  );
}

export function ListingSalePriceBox({
  listingId,
  salePrice,
  krwLabel,
  usdLabel,
  eurLabel,
  canEdit = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => formatWonInput(salePrice ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fx = [usdLabel, eurLabel].filter(Boolean).join("  ·  ");
  const displayKrw = krwLabel || "미등록";

  function openEditor() {
    setValue(formatWonInput(salePrice ?? ""));
    setError(null);
    setOpen(true);
  }

  function save(nextValue = value, closeAfter = true) {
    if (!listingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateListingSalePrice(listingId, nextValue);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (closeAfter) setOpen(false);
      router.refresh();
    });
  }

  function clearSalePrice() {
    if (!listingId || pending) return;
    save("", false);
  }

  return (
    <>
      <div className="listing-sale-price-box">
        <div className="listing-sale-price-box-label">Sale Price</div>
        <div className="listing-sale-price-box-value">
          <div className="listing-sale-price-box-row">
            <p
              className={`listing-sale-price-box-krw${
                krwLabel ? "" : " is-empty"
              }`}
            >
              {displayKrw}
            </p>
            {canEdit && listingId ? (
              <div className="listing-sale-price-actions">
                <button
                  type="button"
                  className="listing-sale-price-edit"
                  title="판매가 빠른 수정"
                  aria-label="판매가 빠른 수정"
                  disabled={pending}
                  onClick={openEditor}
                >
                  <PencilIcon />
                </button>
                {krwLabel ? (
                  <button
                    type="button"
                    className="listing-sale-price-edit is-clear"
                    title="판매가 즉시 삭제"
                    aria-label="판매가 즉시 삭제"
                    disabled={pending}
                    onClick={clearSalePrice}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {fx ? <p className="listing-sale-price-box-fx">≈ {fx}</p> : null}
          {error && !open ? (
            <p className="mt-1 text-[12px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {canEdit && listingId ? (
        <AuthModalShell
          open={open}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          title="판매가 수정"
          maxWidthClass="max-w-[22rem]"
          closeOnBackdrop={!pending}
        >
          <div className="px-5 pb-5 pt-1">
            <h2 className="text-[16px] font-semibold tracking-tight text-neutral-900">
              판매가 수정
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
              비우면 판매가가 목록·상세에서 숨겨집니다.
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-neutral-600">
                판매가 (원)
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={value}
                disabled={pending}
                placeholder="예: 14,900,000"
                onChange={(e) => setValue(formatWonInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[14px] tracking-wide outline-none focus:border-neutral-400"
              />
            </label>
            {value ? (
              <p className="mt-2 text-[12.5px] font-semibold text-[var(--accent)]">
                {formatSalePriceDisplay(value)}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 text-[12.5px] text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center rounded-md border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => save()}
                className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-3.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </AuthModalShell>
      ) : null}
    </>
  );
}
