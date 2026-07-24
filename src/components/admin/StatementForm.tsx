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
  isExtraLineKey,
  newExtraLineKey,
  orphanListingKey,
  parseOrphanListingKey,
  sumLineAmounts,
  type ListingOption,
  type MemberOption,
  type StatementView,
} from "@/lib/statement";

const fieldClass =
  "mt-1 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] text-neutral-800 outline-none focus:border-neutral-400";
const labelClass = "block text-[12.5px] font-medium text-neutral-600";

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
  lineKey: string;
  kind: "listing" | "extra";
  label: string;
  serialNumber: string;
  vin: string | null;
  vehicleNumber: string | null;
  amount: string;
};

function withExtrasLast(lines: SelectedLine[]): SelectedLine[] {
  return [
    ...lines.filter((s) => s.kind !== "extra"),
    ...lines.filter((s) => s.kind === "extra"),
  ];
}

type Props = {
  mode: "create" | "edit";
  listings: ListingOption[];
  members: MemberOption[];
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
  return withExtrasLast(
    lines.map((line) => {
    const isExtra =
      line.isExtra === true ||
      (!line.listingId && line.serialNumber === "EXTRA");

    if (isExtra) {
      return {
        lineKey: line.id ? `extra:${line.id}` : newExtraLineKey(),
        kind: "extra" as const,
        label: line.vehicleLabel,
        serialNumber: "EXTRA",
        vin: null,
        vehicleNumber: null,
        amount: formatAmountInput(line.amount, currency) ?? line.amount,
      };
    }

    const formKey =
      line.listingId ??
      (line.id ? orphanListingKey(line.id) : orphanListingKey("legacy"));
    const opt = listings.find((l) => l.id === formKey);
    return {
      lineKey: formKey,
      kind: "listing" as const,
      label: opt?.label ?? line.vehicleLabel,
      serialNumber: line.serialNumber,
      vin: line.vin,
      vehicleNumber: line.vehicleNumber,
      amount: formatAmountInput(line.amount, currency) ?? line.amount,
    };
  }),
  );
}

export function StatementForm({
  mode,
  listings,
  members,
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
  const [buyerUserId, setBuyerUserId] = useState<string | null>(
    initial?.buyerUserId ?? null,
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
  const [memberQuery, setMemberQuery] = useState("");

  const selectedListingIds = useMemo(
    () =>
      new Set(
        selected
          .filter((s) => s.kind === "listing")
          .map((s) => s.lineKey),
      ),
    [selected],
  );

  const listingCount = selected.filter((s) => s.kind === "listing").length;
  const extraCount = selected.filter((s) => s.kind === "extra").length;

  const filteredListings = useMemo(() => {
    const selectable = listings.filter(
      (l) => !parseOrphanListingKey(l.id) && !isExtraLineKey(l.id),
    );
    const q = listingQuery.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.serialNumber.toLowerCase().includes(q) ||
        (l.vin ?? "").toLowerCase().includes(q) ||
        (l.vehicleNumber ?? "").toLowerCase().includes(q),
    );
  }, [listings, listingQuery]);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === buyerUserId) ?? null,
    [members, buyerUserId],
  );

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members.slice(0, 40);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [members, memberQuery]);

  function selectMember(member: MemberOption) {
    setBuyerUserId(member.id);
    setBuyerName(member.name);
    if (member.phone) setBuyerPhone(member.phone);
    setMemberQuery("");
  }

  function clearMemberLink() {
    setBuyerUserId(null);
  }

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
    if (selectedListingIds.has(listing.id)) return;
    setSelected((prev) =>
      withExtrasLast([
        ...prev,
        {
          lineKey: listing.id,
          kind: "listing",
          label: listing.label,
          serialNumber: listing.serialNumber,
          vin: listing.vin,
          vehicleNumber: listing.vehicleNumber,
          amount: "",
        },
      ]),
    );
  }

  function addExtraLine() {
    setSelected((prev) =>
      withExtrasLast([
        ...prev,
        {
          lineKey: newExtraLineKey(),
          kind: "extra",
          label: "서비스 비용",
          serialNumber: "EXTRA",
          vin: null,
          vehicleNumber: null,
          amount: "",
        },
      ]),
    );
  }

  function removeLine(lineKey: string) {
    setSelected((prev) => prev.filter((s) => s.lineKey !== lineKey));
  }

  function updateLineAmount(lineKey: string, raw: string) {
    const next = formatAmountInput(raw, currency);
    if (next === null) return;
    setSelected((prev) =>
      prev.map((s) => (s.lineKey === lineKey ? { ...s, amount: next } : s)),
    );
  }

  function updateExtraLabel(lineKey: string, label: string) {
    setSelected((prev) =>
      prev.map((s) => (s.lineKey === lineKey ? { ...s, label } : s)),
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
      setError("품목을 1개 이상 추가해 주세요.");
      return;
    }
    if (selected.some((s) => !s.amount.trim())) {
      setError("모든 품목의 공급가액을 입력해 주세요.");
      return;
    }
    if (selected.some((s) => s.kind === "extra" && !s.label.trim())) {
      setError("별도 금액 품목명을 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const payload = {
        items: withExtrasLast(selected).map((s) => ({
          lineKey: s.lineKey,
          label: s.kind === "extra" ? s.label.trim() : undefined,
          amount: s.amount,
        })),
        buyerName,
        buyerPhone: buyerPhone || undefined,
        buyerAddress: buyerAddress || undefined,
        buyerUserId: buyerUserId || null,
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
                const checked = selectedListingIds.has(l.id);
                return (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-[13px] hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => {
                          if (checked) removeLine(l.id);
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={labelClass}>
            선택 품목 ({listingCount}대
            {extraCount > 0 ? ` + 별도 ${extraCount}` : ""}) · 공급가액
          </p>
          <button
            type="button"
            onClick={addExtraLine}
            className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-2.5 text-[12.5px] font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            + 별도 금액
          </button>
        </div>
        {selected.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-4 text-[13px] text-neutral-500">
            매물을 선택하거나 「별도 금액」으로 서비스 비용 등을 추가해 주세요.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selected.map((line, index) => (
              <li
                key={line.lineKey}
                className={`rounded-md border px-3 py-3 ${
                  line.kind === "extra"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-neutral-400">
                      품목 {index + 1}
                      {line.kind === "extra" ? " · 별도 금액" : ""}
                    </p>
                    {line.kind === "extra" ? (
                      <input
                        value={line.label}
                        onChange={(e) =>
                          updateExtraLabel(line.lineKey, e.target.value)
                        }
                        placeholder="예: 서비스 비용, 탁송비"
                        className={`${fieldClass} mt-1 font-medium`}
                        required
                      />
                    ) : (
                      <p className="font-medium text-neutral-800">
                        [{line.serialNumber}] {line.label}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-[12.5px] text-red-600 hover:underline"
                    onClick={() => removeLine(line.lineKey)}
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
                      updateLineAmount(line.lineKey, e.target.value)
                    }
                    placeholder="예: 150,000"
                    className={fieldClass}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="member-search">
            회원 선택 (아이디)
          </label>
          <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">
            가입 회원을 연결하면 누적 구매액 등 분석에 사용할 수 있습니다. 비회원
            거래는 아래에서 거래처명만 직접 입력하세요.
          </p>
          {selectedMember ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50/80 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-sky-950">
                  {selectedMember.name}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-sky-800/80">
                  {selectedMember.email}
                  {selectedMember.phone ? ` · ${selectedMember.phone}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={clearMemberLink}
                className="shrink-0 rounded-md border border-sky-200 bg-white px-2.5 py-1 text-[12px] font-medium text-sky-900 transition hover:bg-sky-50"
              >
                연결 해제
              </button>
            </div>
          ) : (
            <>
              <input
                id="member-search"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="이름, 아이디, 연락처 검색…"
                className={fieldClass}
                autoComplete="off"
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-[var(--line)]">
                {filteredMembers.length === 0 ? (
                  <p className="px-3 py-3 text-[13px] text-neutral-500">
                    {memberQuery.trim()
                      ? "검색 결과가 없습니다."
                      : "회원을 검색해 선택하세요."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--line)]">
                    {filteredMembers.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => selectMember(m)}
                          className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-neutral-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-neutral-800">
                              {m.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                              {m.email}
                              {m.phone ? ` · ${m.phone}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-[12px] font-medium text-sky-700">
                            선택
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

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

        <div className="rounded-md border border-[var(--line)] bg-neutral-50 px-3 py-3 text-[13px] text-neutral-700 sm:col-span-2">
          <p className="flex justify-between gap-3">
            <span>
              공급가액 합계 ({listingCount}대
              {extraCount > 0 ? ` + 별도 ${extraCount}` : ""})
            </span>
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
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13.5px] text-neutral-800 outline-none focus:border-neutral-400"
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
          className="inline-flex h-10 items-center rounded-md bg-neutral-800 px-4 text-[13.5px] font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "저장 중…" : mode === "create" ? "저장" : "수정 저장"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/statements")}
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-[13.5px] font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          목록
        </button>
      </div>
    </form>
  );
}
