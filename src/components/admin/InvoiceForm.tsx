"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOverseasInvoice,
  updateOverseasInvoice,
} from "@/app/admin/invoice-actions";
import {
  INVOICE_CURRENCIES,
  addDaysToDateString,
  calcFinalFromKrw,
  isInvoiceCreditLine,
  newInvoiceExtraKey,
  parseTermsDays,
  type InvoiceCurrency,
  type InvoiceView,
  type ListingOption,
} from "@/lib/overseas-invoice";

const fieldClass =
  "mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-800 outline-none focus:border-neutral-400";
const labelClass = "block text-[12px] font-medium text-neutral-600";

type Line = {
  lineKey: string;
  kind: "listing" | "extra" | "credit";
  description: string;
  regNo: string;
  vin: string;
  qty: string;
  priceKrw: string;
};

type Props = {
  mode: "create" | "edit";
  listings: ListingOption[];
  initial?: InvoiceView;
  defaultInvoiceDate: string;
  onCancel?: () => void;
};

function formatKrwInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

export function InvoiceForm({
  mode,
  listings,
  initial,
  defaultInvoiceDate,
  onCancel,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [invoiceDate, setInvoiceDate] = useState(
    initial?.invoiceDate ?? defaultInvoiceDate,
  );
  const [termsDays, setTermsDays] = useState(
    initial ? parseTermsDays(initial.terms) : 3,
  );
  const [company, setCompany] = useState(initial?.company ?? "");
  const [consignee, setConsignee] = useState(initial?.consignee ?? "");
  const [businessNo, setBusinessNo] = useState(initial?.businessNo ?? "");
  const [finalDestination, setFinalDestination] = useState(
    initial?.finalDestination ?? "",
  );
  const [currency, setCurrency] = useState<InvoiceCurrency>(
    (initial?.currency as InvoiceCurrency) ?? "EUR",
  );
  const [exchangeRate, setExchangeRate] = useState(
    initial?.exchangeRate
      ? Number(initial.exchangeRate).toLocaleString("en-US")
      : "",
  );
  const [prepaidLabel, setPrepaidLabel] = useState(
    initial?.prepaidLabel ?? "100% PREPAID",
  );
  const [listingQuery, setListingQuery] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    if (!initial?.items?.length) return [];
    return initial.items
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => {
        const credit = isInvoiceCreditLine(item);
        return {
          lineKey: item.listingId ? item.listingId : newInvoiceExtraKey(),
          kind: credit
            ? "credit"
            : item.isExtra || !item.listingId
              ? "extra"
              : "listing",
          description: item.description,
          regNo: item.regNo ?? "",
          vin: item.vin ?? "",
          qty: item.qty || "1",
          priceKrw: formatKrwInput(item.priceKrw),
        };
      });
  });

  const dueDate = addDaysToDateString(invoiceDate, termsDays);
  const rateClean = exchangeRate.replace(/,/g, "");

  const selectedListingIds = useMemo(
    () =>
      new Set(
        lines.filter((l) => l.kind === "listing").map((l) => l.lineKey),
      ),
    [lines],
  );

  const filteredListings = useMemo(() => {
    const q = listingQuery.trim().toLowerCase();
    const base = listings;
    if (!q) return base.slice(0, 60);
    return base
      .filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.serialNumber.toLowerCase().includes(q) ||
          (l.vin ?? "").toLowerCase().includes(q) ||
          (l.vehicleNumber ?? "").toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [listings, listingQuery]);

  function addListing(listing: ListingOption) {
    if (selectedListingIds.has(listing.id)) return;
    setLines((prev) => [
      ...prev,
      {
        lineKey: listing.id,
        kind: "listing",
        description: listing.label,
        regNo: listing.vehicleNumber ?? "",
        vin: listing.vin ?? "",
        qty: "1",
        priceKrw: "",
      },
    ]);
  }

  function removeListing(listingId: string) {
    setLines((prev) => prev.filter((row) => row.lineKey !== listingId));
  }

  function addExtra(kind: "extra" | "credit" = "extra") {
    setLines((prev) => [
      ...prev,
      {
        lineKey: newInvoiceExtraKey(),
        kind,
        description: kind === "credit" ? "CREDIT" : "",
        regNo: "",
        vin: "",
        qty: "1",
        priceKrw: "",
      },
    ]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        invoiceDate,
        termsDays,
        company: company.trim() || undefined,
        consignee: consignee.trim(),
        businessNo: businessNo.trim() || undefined,
        finalDestination: finalDestination.trim() || undefined,
        currency,
        exchangeRate,
        prepaidLabel,
        items: lines.map((line) => ({
          lineKey: line.lineKey,
          description: line.description,
          regNo: line.regNo || undefined,
          vin: line.vin || undefined,
          qty: line.qty || "1",
          priceKrw: line.priceKrw,
          isCredit: line.kind === "credit",
        })),
      };
      const result =
        mode === "edit" && initial
          ? await updateOverseasInvoice(initial.id, payload)
          : await createOverseasInvoice(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/invoices/${result.id}`);
      router.refresh();
    });
  }

  const listingCount = lines.filter((l) => l.kind === "listing").length;
  const extraCount = lines.filter((l) => l.kind === "extra").length;
  const creditCount = lines.filter((l) => l.kind === "credit").length;
  const netFxPreview = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      const fx = Number(calcFinalFromKrw(line.priceKrw, rateClean));
      if (!Number.isFinite(fx) || fx <= 0) continue;
      sum += line.kind === "credit" ? -fx : fx;
    }
    return sum;
  }, [lines, rateClean]);

  return (
    <form onSubmit={onSubmit} className="space-y-4" lang="en">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Invoice Date</span>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Terms (days)</span>
          <input
            type="number"
            min={1}
            max={365}
            required
            value={termsDays}
            onChange={(e) => setTermsDays(Number(e.target.value) || 3)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Due Date</span>
          <input
            value={dueDate}
            readOnly
            className={`${fieldClass} bg-neutral-50`}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as InvoiceCurrency)}
            className={fieldClass}
          >
            {INVOICE_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Exchange Rate (KRW → {currency})</span>
          <input
            required
            value={exchangeRate}
            onChange={(e) => setExchangeRate(formatKrwInput(e.target.value))}
            placeholder="1,729"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Prepaid label</span>
          <input
            value={prepaidLabel}
            onChange={(e) => setPrepaidLabel(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Consignee *</span>
          <input
            required
            value={consignee}
            onChange={(e) => setConsignee(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Company</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Business no.</span>
          <input
            value={businessNo}
            onChange={(e) => setBusinessNo(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Final destination</span>
          <input
            value={finalDestination}
            onChange={(e) => setFinalDestination(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div>
        <label className={labelClass} htmlFor="invoice-listing-search">
          매물 검색 · 다중 선택
        </label>
        <input
          id="invoice-listing-search"
          type="search"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          placeholder="시리얼, 차량명, VIN, 차량번호…"
          className={fieldClass}
          autoComplete="off"
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-white">
          {filteredListings.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-neutral-500">
              {listingQuery.trim()
                ? "검색 결과가 없습니다."
                : "등록된 매물이 없습니다."}
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
                            {[
                              l.vin ? `VIN ${l.vin}` : null,
                              l.vehicleNumber,
                            ]
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
        {!listingQuery.trim() && listings.length > 60 ? (
          <p className="mt-1.5 text-[11.5px] text-neutral-500">
            상위 60건만 표시됩니다. 검색어로 더 찾아보세요.
          </p>
        ) : null}
      </div>

      <div className="rounded-sm border border-[var(--line)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-neutral-50 px-3 py-2">
          <p className="text-[12px] font-medium text-neutral-600">
            Line items ({listingCount}
            {extraCount > 0 ? ` + extra ${extraCount}` : ""}
            {creditCount > 0 ? ` + credit ${creditCount}` : ""})
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => addExtra("extra")}
              className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px] font-medium"
            >
              + Extra
            </button>
            <button
              type="button"
              onClick={() => addExtra("credit")}
              className="h-8 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-[12px] font-medium text-rose-800"
            >
              + Credit
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {lines.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] text-neutral-500">
              위에서 매물을 검색·선택하거나 Extra / Credit 항목을 추가하세요.
            </p>
          ) : (
            lines.map((line) => {
              const finalApprox = calcFinalFromKrw(line.priceKrw, rateClean);
              const isCredit = line.kind === "credit";
              return (
                <div
                  key={line.lineKey}
                  className={`space-y-2 px-3 py-3${
                    isCredit ? " bg-rose-50/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isCredit ? (
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-rose-700">
                          CREDIT — subtracted from the invoice total
                        </p>
                      ) : null}
                      <input
                      value={line.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.lineKey === line.lineKey
                              ? { ...row, description: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder={
                        isCredit
                          ? "CREDIT — previous remittance / cancelled unit"
                          : "Description"
                      }
                      className={`${fieldClass} mt-0`}
                      required
                    />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((row) => row.lineKey !== line.lineKey),
                        )
                      }
                      className="mt-1 shrink-0 text-[12px] text-neutral-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input
                      value={line.regNo}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.lineKey === line.lineKey
                              ? { ...row, regNo: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Reg. No."
                      className={`${fieldClass} mt-0`}
                    />
                    <input
                      value={line.vin}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.lineKey === line.lineKey
                              ? { ...row, vin: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="VIN"
                      className={`${fieldClass} mt-0`}
                    />
                    <input
                      value={line.qty}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.lineKey === line.lineKey
                              ? { ...row, qty: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Qty"
                      className={`${fieldClass} mt-0`}
                    />
                    <input
                      value={line.priceKrw}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row) =>
                            row.lineKey === line.lineKey
                              ? {
                                  ...row,
                                  priceKrw: formatKrwInput(e.target.value),
                                }
                              : row,
                          ),
                        )
                      }
                      placeholder={isCredit ? "CREDIT (₩)" : "PRICE (₩)"}
                      className={`${fieldClass} mt-0`}
                      required
                    />
                  </div>
                  <p className="text-[11.5px] text-neutral-500">
                    Final ≈{" "}
                    {finalApprox
                      ? `${isCredit ? "− " : ""}${currency} ${Number(finalApprox).toLocaleString("en-US")}`
                      : "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
        {lines.length > 0 ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--line)] bg-neutral-50 px-3 py-2.5">
            <p className="text-[12px] text-neutral-500">
              Charges minus credits. Buyer pays this balance.
            </p>
            <p className="text-[13px] font-semibold text-neutral-900">
              Net total ≈ {currency}{" "}
              {netFxPreview.toLocaleString("en-US")}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || lines.length === 0}
          className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-[13px] font-medium text-white disabled:bg-neutral-300"
        >
          {pending
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Create invoice"}
        </button>
        <button
          type="button"
          onClick={() =>
            onCancel ? onCancel() : router.push("/admin/invoices")
          }
          className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-4 text-[13px] font-medium text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
