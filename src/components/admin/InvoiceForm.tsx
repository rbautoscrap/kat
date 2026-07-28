"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOverseasInvoice,
  updateOverseasInvoice,
} from "@/app/admin/invoice-actions";
import {
  INVOICE_CURRENCIES,
  addDaysToDateString,
  calcFinalFromKrw,
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
  kind: "listing" | "extra";
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
  const [listingPick, setListingPick] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    if (!initial?.items?.length) return [];
    return initial.items
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => ({
        lineKey: item.listingId ? item.listingId : newInvoiceExtraKey(),
        kind: item.isExtra || !item.listingId ? "extra" : "listing",
        description: item.description,
        regNo: item.regNo ?? "",
        vin: item.vin ?? "",
        qty: item.qty || "1",
        priceKrw: formatKrwInput(item.priceKrw),
      }));
  });

  const dueDate = addDaysToDateString(invoiceDate, termsDays);
  const rateClean = exchangeRate.replace(/,/g, "");

  function addListing() {
    if (!listingPick) return;
    if (lines.some((l) => l.lineKey === listingPick)) return;
    const listing = listings.find((l) => l.id === listingPick);
    if (!listing) return;
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
    setListingPick("");
  }

  function addExtra() {
    setLines((prev) => [
      ...prev,
      {
        lineKey: newInvoiceExtraKey(),
        kind: "extra",
        description: "",
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

  const availableListings = listings.filter(
    (l) => !lines.some((line) => line.lineKey === l.id),
  );

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

      <div className="rounded-sm border border-[var(--line)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-neutral-50 px-3 py-2">
          <select
            value={listingPick}
            onChange={(e) => setListingPick(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-[12.5px]"
          >
            <option value="">Select listing…</option>
            {availableListings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addListing}
            className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px] font-medium"
          >
            Add vehicle
          </button>
          <button
            type="button"
            onClick={addExtra}
            className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[12px] font-medium"
          >
            + Extra
          </button>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {lines.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] text-neutral-500">
              Add a vehicle or extra charge line.
            </p>
          ) : (
            lines.map((line) => {
              const finalApprox = calcFinalFromKrw(line.priceKrw, rateClean);
              return (
                <div key={line.lineKey} className="space-y-2 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
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
                      placeholder="Description"
                      className={`${fieldClass} mt-0`}
                      required
                    />
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
                      placeholder="PRICE (₩)"
                      className={`${fieldClass} mt-0`}
                      required
                    />
                  </div>
                  <p className="text-[11.5px] text-neutral-500">
                    Final ≈{" "}
                    {finalApprox
                      ? `${currency} ${Number(finalApprox).toLocaleString("en-US")}`
                      : "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
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
