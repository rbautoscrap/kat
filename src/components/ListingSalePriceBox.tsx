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
  buyHref?: string | null;
  canEdit?: boolean;
};

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.3c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.45-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
      <path d="M12.04 2C6.58 2 2.15 6.42 2.15 11.87c0 1.9.5 3.75 1.45 5.38L2 22l4.9-1.28a9.86 9.86 0 0 0 5.14 1.4h.01c5.46 0 9.89-4.42 9.89-9.87C21.94 6.42 17.5 2 12.04 2zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.18 8.18 0 0 1-1.26-4.35c0-4.53 3.7-8.21 8.22-8.21 4.52 0 8.21 3.68 8.21 8.21 0 4.53-3.69 8.19-8.22 8.19z" />
    </svg>
  );
}

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
  buyHref = null,
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
          {krwLabel ? (
            <p className="listing-sale-price-deal">Special discounted price</p>
          ) : null}
          <div className="listing-sale-price-box-row">
            <p
              className={`listing-sale-price-box-krw${
                krwLabel ? "" : " is-empty"
              }`}
            >
              {displayKrw}
            </p>
            {buyHref ? (
              <a
                href={buyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="listing-sale-price-buy"
                title="Buy now via WhatsApp CS"
              >
                <WhatsAppIcon />
                Buy Now
              </a>
            ) : null}
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
