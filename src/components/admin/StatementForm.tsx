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
import {
  STATEMENT_BANK,
  STATEMENT_VAT_RATE,
  calcStatementTotals,
  getStatementLines,
  sumLineAmounts,
  type ListingOption,
  type StatementView,
} from "@/lib/statement";

const fieldClass =
  "mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none focus:border-neutral-400";
const labelClass =
  "block text-[12.5px] font-medium tracking-wide text-neutral-600";

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

type SelectedLine = {
  listingId: string;
  label: string;
  serialNumber: string;
  vin: string | null;
  vehicleNumber: string | null;
  amount: string;
};

type Props = {
  mode: "create" | "edit";
  listings: ListingOption[];
  initial?: StatementView;
  defaultIssueDate: string;
};

function initialLines(
  listings: ListingOption[],
  initial: StatementView | undefined,
  currency: OfferCurrencyCode,
): SelectedLine[] {
  if (!initial) return [];
  const lines = getStatementLines(initial);
  return lines.map((line) => {
    const opt = listings.find((l) => l.id === line.listingId);
    return {
      listingId: line.listingId,
      label: opt?.label ?? line.vehicleLabel,
      serialNumber: line.serialNumber,
      vin: line.vin,
      vehicleNumber: line.vehicleNumber,
      amount: formatAmountInput(line.amount, currency) ?? line.amount,
    };
  });
}

export function StatementForm({
  mode,
  listings,
  initial,
  defaultIssueDate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialCurrency =
    (initial?.currency as OfferCurrencyCode) ?? "KRW";
  const [selected, setSelected] = useState<SelectedLine[]>(() =>
    initialLines(listings, initial, initialCurrency),
  );
  const [buyerName, setBuyerName] = useState(initial?.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(initial?.buyerPhone ?? "");
  const [buyerAddress, setBuyerAddress] = useState(initial?.buyerAddress ?? "");
  const [currency, setCurrency] = useState<OfferCurrencyCode>(initialCurrency);
  const [issueDate, setIssueDate] = useState(
    initial?.issueDate ?? defaultIssueDate,
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [includeVat, setIncludeVat] = useState(initial?.includeVat !== false);
  const [listingQuery, setListingQuery] = useState("");

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.listingId)),
    [selected],
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

  const supplySum = useMemo(
    () =>
      sumLineAmounts(
        selected.map((s) => ({ amount: s.amount.replace(/,/g, "") || "0" })),
        currency,
      ),
    [selected, currency],
  );

  const totals = useMemo(
    () => calcStatementTotals(supplySum, currency, includeVat),
    [supplySum, currency, includeVat],
  );
  const vatPct = Math.round(STATEMENT_VAT_RATE * 100);

  function addListing(listing: ListingOption) {
    if (selectedIds.has(listing.id)) return;
    setSelected((prev) => [
      ...prev,
      {
        listingId: listing.id,
        label: listing.label,
        serialNumber: listing.serialNumber,
        vin: listing.vin,
        vehicleNumber: listing.vehicleNumber,
        amount: "",
      },
    ]);
  }

  function removeListing(listingId: string) {
    setSelected((prev) => prev.filter((s) => s.listingId !== listingId));
  }

  function updateLineAmount(listingId: string, raw: string) {
    const next = formatAmountInput(raw, currency);
    if (next === null) return;
    setSelected((prev) =>
      prev.map((s) =>
        s.listingId === listingId ? { ...s, amount: next } : s,
      ),
    );
  }

  function onCurrencyChange(next: OfferCurrencyCode) {
    setCurrency(next);
    setSelected((prev) =>
      prev.map((s) => ({
        ...s,
        amount: formatAmountInput(s.amount, next) ?? s.amount,
      })),
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("매물을 1개 이상 선택해 주세요.");
      return;
    }
    if (selected.some((s) => !s.amount.trim())) {
      setError("선택한 매물의 공급가액을 모두 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const payload = {
        items: selected.map((s) => ({
          listingId: s.listingId,
          amount: s.amount,
        })),
        buyerName,
        buyerPhone: buyerPhone || undefined,
        buyerAddress: buyerAddress || undefined,
        currency,
        includeVat,
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
          매물 검색 · 다중 선택
        </label>
        <input
          id="listing-search"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          placeholder="시리얼, 차량명, VIN…"
          className={fieldClass}
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[var(--line)]">
          {filteredListings.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-neutral-500">
              검색 결과가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {filteredListings.map((l) => {
                const checked = selectedIds.has(l.id);
                return (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-[13px] hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => {
                          if (checked) removeListing(l.id);
                          else addListing(l);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-neutral-800">
                          [{l.serialNumber}] {l.label}
                        </span>
                        {(l.vin || l.vehicleNumber) && (
                          <span className="mt-0.5 block text-[12px] text-neutral-500">
                            {[l.vin ? `VIN ${l.vin}` : null, l.vehicleNumber]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className={labelClass}>
          선택 매물 ({selected.length}대) · 품목별 공급가액
        </p>
        {selected.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-4 text-[13px] text-neutral-500">
            위에서 매물을 체크해 추가해 주세요. 여러 대를 선택할 수 있습니다.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selected.map((line, index) => (
              <li
                key={line.listingId}
                className="rounded-md border border-[var(--line)] bg-white px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-neutral-400">
                      품목 {index + 1}
                    </p>
                    <p className="font-medium text-neutral-800">
                      [{line.serialNumber}] {line.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[12.5px] text-red-600 hover:underline"
                    onClick={() => removeListing(line.listingId)}
                  >
                    제거
                  </button>
                </div>
                <label className="mt-2 block">
                  <span className="text-[12px] text-neutral-500">
                    공급가액 (부가세 별도)
                  </span>
                  <input
                    required
                    inputMode="decimal"
                    value={line.amount}
                    onChange={(e) =>
                      updateLineAmount(line.listingId, e.target.value)
                    }
                    placeholder="예: 15,000,000"
                    className={fieldClass}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
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
        <label className="block sm:col-span-2">
          <span className={labelClass}>통화</span>
          <select
            value={currency}
            onChange={(e) =>
              onCurrencyChange(e.target.value as OfferCurrencyCode)
            }
            className={fieldClass}
          >
            {OFFER_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_META[c].label} ({CURRENCY_META[c].symbol})
              </option>
            ))}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>부가세</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13px] ${
                includeVat
                  ? "border-neutral-800 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              <input
                type="radio"
                name="includeVat"
                className="sr-only"
                checked={includeVat}
                onChange={() => setIncludeVat(true)}
              />
              부가세 포함 ({vatPct}%)
            </label>
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13px] ${
                !includeVat
                  ? "border-neutral-800 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              <input
                type="radio"
                name="includeVat"
                className="sr-only"
                checked={!includeVat}
                onChange={() => setIncludeVat(false)}
              />
              부가세 미포함 (영세율)
            </label>
          </div>
        </fieldset>

        <div className="rounded-md border border-[var(--line)] bg-neutral-50 px-3 py-3 text-[13px] tracking-wide text-neutral-700 sm:col-span-2">
          <p className="flex justify-between gap-3">
            <span>공급가액 합계 ({selected.length}대)</span>
            <span className="font-medium">{totals.supplyLabel}</span>
          </p>
          <p className="mt-1 flex justify-between gap-3">
            <span>
              {includeVat ? `부가세 (${vatPct}%)` : "부가세 (영세율)"}
            </span>
            <span className="font-medium">{totals.vatLabel}</span>
          </p>
          <p className="mt-2 flex justify-between gap-3 border-t border-neutral-200 pt-2 text-[14px] font-semibold text-neutral-900">
            <span>합계</span>
            <span>{totals.totalLabel}</span>
          </p>
          <p className="mt-3 border-t border-neutral-200 pt-2 text-[12.5px] text-neutral-500">
            입금 계좌: {STATEMENT_BANK.bankName} {STATEMENT_BANK.accountNo}{" "}
            {STATEMENT_BANK.accountHolder}
          </p>
        </div>
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
          disabled={pending || selected.length === 0}
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
