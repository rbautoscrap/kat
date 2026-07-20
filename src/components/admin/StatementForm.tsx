"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStatement,
  updateStatement,
} from "@/app/admin/statement-actions";
import {
  CURRENCY_META,
  OFFER_CURRENCIES,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";
import type { ListingOption, StatementView } from "@/lib/statement";

const fieldClass =
  "mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none focus:border-neutral-400";
const labelClass = "block text-[12.5px] font-medium tracking-wide text-neutral-600";

/** Display amount with thousands separators (e.g. 15,000,000). */
function formatAmountInput(raw: string, currency: OfferCurrencyCode) {
  const cleaned = raw.replace(/,/g, "");
  if (!cleaned) return "";

  if (currency === "KRW") {
    const digits = cleaned.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-US");
  }

  const parts = cleaned.replace(/[^\d.]/g, "").split(".");
  if (parts.length > 2) return null;
  const intDigits = parts[0] ?? "";
  const intFormatted = intDigits
    ? Number(intDigits).toLocaleString("en-US")
    : "";
  if (parts.length === 1) return intFormatted;
  const decimals = (parts[1] ?? "").slice(0, 2);
  if (cleaned.endsWith(".") && decimals === "") {
    return `${intFormatted}.`;
  }
  return `${intFormatted}.${decimals}`;
}

type Props = {
  mode: "create" | "edit";
  listings: ListingOption[];
  initial?: StatementView;
  defaultIssueDate: string;
};

export function StatementForm({
  mode,
  listings,
  initial,
  defaultIssueDate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [listingId, setListingId] = useState(
    initial?.listingId ?? listings[0]?.id ?? "",
  );
  const [buyerName, setBuyerName] = useState(initial?.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(initial?.buyerPhone ?? "");
  const [buyerAddress, setBuyerAddress] = useState(initial?.buyerAddress ?? "");
  const initialCurrency =
    (initial?.currency as OfferCurrencyCode) ?? "KRW";
  const [amount, setAmount] = useState(() =>
    initial?.amount
      ? formatAmountInput(initial.amount, initialCurrency) ?? initial.amount
      : "",
  );
  const [currency, setCurrency] = useState<OfferCurrencyCode>(initialCurrency);
  const [issueDate, setIssueDate] = useState(
    initial?.issueDate ?? defaultIssueDate,
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [listingQuery, setListingQuery] = useState("");

  const selected = useMemo(
    () => listings.find((l) => l.id === listingId) ?? null,
    [listings, listingId],
  );

  const filteredListings = useMemo(() => {
    const q = listingQuery.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.serialNumber.toLowerCase().includes(q) ||
        (l.vin ?? "").toLowerCase().includes(q) ||
        (l.vehicleNumber ?? "").toLowerCase().includes(q),
    );
  }, [listings, listingQuery]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        listingId,
        buyerName,
        buyerPhone: buyerPhone || undefined,
        buyerAddress: buyerAddress || undefined,
        amount,
        currency,
        issueDate,
        notes: notes || undefined,
      };
      const result =
        mode === "create"
          ? await createStatement(payload)
          : await updateStatement(initial!.id, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/statements/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={labelClass} htmlFor="listing-search">
          매물 검색
        </label>
        <input
          id="listing-search"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          placeholder="시리얼, 차량명, VIN…"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="listingId">
          매물 선택
        </label>
        <select
          id="listingId"
          required
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className={fieldClass}
        >
          {filteredListings.length === 0 ? (
            <option value="">검색 결과 없음</option>
          ) : (
            filteredListings.map((l) => (
              <option key={l.id} value={l.id}>
                [{l.serialNumber}] {l.label}
              </option>
            ))
          )}
        </select>
        {selected ? (
          <div className="mt-2 rounded-md border border-[var(--line)] bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-600">
            <p className="font-medium text-neutral-800">{selected.label}</p>
            <p className="mt-1">시리얼: {selected.serialNumber}</p>
            {selected.vin ? <p>VIN: {selected.vin}</p> : null}
            {selected.vehicleNumber ? (
              <p>차량번호: {selected.vehicleNumber}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>거래처명 (공급받는자)</span>
          <input
            required
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>연락처</span>
          <input
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>발행일</span>
          <input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>주소</span>
          <input
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>금액</span>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const next = formatAmountInput(e.target.value, currency);
              if (next === null) return;
              setAmount(next);
            }}
            placeholder="예: 15,000,000"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>통화</span>
          <select
            value={currency}
            onChange={(e) => {
              const next = e.target.value as OfferCurrencyCode;
              setCurrency(next);
              setAmount((prev) => formatAmountInput(prev, next) ?? prev);
            }}
            className={fieldClass}
          >
            {OFFER_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_META[c].label} ({CURRENCY_META[c].symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>비고</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13.5px] tracking-wide text-neutral-800 outline-none focus:border-neutral-400"
          />
        </label>
      </div>

      {error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !listingId}
          className="inline-flex h-10 items-center rounded-md bg-neutral-800 px-4 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "저장 중…" : mode === "create" ? "저장" : "수정 저장"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/statements")}
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-[13.5px] font-medium tracking-wide text-neutral-700 transition hover:bg-neutral-50"
        >
          목록
        </button>
      </div>
    </form>
  );
}
