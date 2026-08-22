import {
  SALE_SHIPMENT_DONE,
  SALE_SHIPMENT_TYPES,
  displayShipmentType,
  parseSaleMoney,
  sumSaleRows,
  type DailySaleRow,
  type DailySaleTotals,
} from "@/lib/sales-daily";

export type MonthPurchaseTotals = {
  count: number;
  auction: number;
  incidental: number;
  cost: number;
};

export const EMPTY_MONTH_PURCHASES: MonthPurchaseTotals = {
  count: 0,
  auction: 0,
  incidental: 0,
  cost: 0,
};

export type MonthlyDayPoint = {
  date: string;
  day: number;
  sales: number;
  profit: number;
  paid: number;
  remaining: number;
  count: number;
};

export type MonthlyBuyerRank = {
  buyerName: string;
  count: number;
  total: number;
  paid: number;
  remaining: number;
  profit: number;
};

export type MonthlyStatusShare = {
  type: string;
  count: number;
  total: number;
};

export type MonthChange = {
  label: string;
  current: number;
  previous: number;
  delta: number;
  pct: number | null;
};

export type MonthlyMomCompare = {
  previousMonth: string;
  previousLabel: string;
  sales: MonthChange;
  fxSalesKrw: MonthChange;
  purchases: MonthChange;
  operatingProfit: MonthChange;
  paid: MonthChange;
  receivables: MonthChange;
};

export type MonthlySalesReportData = {
  month: string;
  start: string;
  end: string;
  label: string;
  sales: DailySaleTotals;
  salesCount: number;
  monthReceivables: DailySaleTotals;
  monthReceivableCount: number;
  outstanding: DailySaleTotals;
  outstandingCount: number;
  fxRemaining: number;
  fxCount: number;
  fxCurrency: DailySaleRow["currency"];
  daily: MonthlyDayPoint[];
  buyers: MonthlyBuyerRank[];
  outstandingBuyers: MonthlyBuyerRank[];
  statuses: MonthlyStatusShare[];
  peakSalesDate: string;
  peakProfitDate: string;
  purchases: MonthPurchaseTotals;
  fxSalesKrw: number;
  fxSalesCount: number;
  fxSales: number;
  operatingProfit: number;
  mom?: MonthlyMomCompare | null;
};

const CANCELLED = "취소";

export function parseYearMonth(value?: string, fallbackDate?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return fallbackDate.slice(0, 7);
  }
  return "";
}

export function monthBounds(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(last).padStart(2, "0")}`;
  return { start, end, days: last, year, month: mon };
}

export function monthLabel(month: string) {
  const { year, month: mon } = monthBounds(month);
  return `${year}년 ${mon}월`;
}

export function previousYearMonth(month: string) {
  const { year, month: mon } = monthBounds(month);
  if (mon === 1) return `${year - 1}-12`;
  return `${year}-${String(mon - 1).padStart(2, "0")}`;
}

export function monthChange(
  label: string,
  current: number,
  previous: number,
): MonthChange {
  const delta = current - previous;
  const pct = previous === 0 ? null : (delta / Math.abs(previous)) * 100;
  return { label, current, previous, delta, pct };
}

export function attachMonthOverMonth(
  current: MonthlySalesReportData,
  previous: MonthlySalesReportData,
): MonthlySalesReportData {
  return {
    ...current,
    mom: {
      previousMonth: previous.month,
      previousLabel: previous.label,
      sales: monthChange("당월 판매액", current.sales.total, previous.sales.total),
      fxSalesKrw: monthChange(
        "외화 판매액",
        current.fxSalesKrw,
        previous.fxSalesKrw,
      ),
      purchases: monthChange(
        "당월 매입비용",
        current.purchases.cost,
        previous.purchases.cost,
      ),
      operatingProfit: monthChange(
        "영업이익",
        current.operatingProfit,
        previous.operatingProfit,
      ),
      paid: monthChange("당월 입금", current.sales.paid, previous.sales.paid),
      receivables: monthChange(
        "당월 미수",
        current.monthReceivables.remaining,
        previous.monthReceivables.remaining,
      ),
    },
  };
}

export function momDirection(change: MonthChange) {
  if (change.delta > 0) return "up" as const;
  if (change.delta < 0) return "down" as const;
  return "flat" as const;
}

export function summarizeMonthOverMonth(mom: MonthlyMomCompare) {
  const items = [
    mom.sales,
    mom.fxSalesKrw,
    mom.purchases,
    mom.operatingProfit,
    mom.paid,
    mom.receivables,
  ];
  const up = items.filter((item) => item.delta > 0).map((item) => item.label);
  const down = items.filter((item) => item.delta < 0).map((item) => item.label);
  const flat = items.filter((item) => item.delta === 0).map((item) => item.label);
  const highlights = [mom.sales, mom.operatingProfit, mom.receivables]
    .filter((item) => item.delta !== 0)
    .map((item) => {
      const verb = item.delta > 0 ? "증가" : "감소";
      const amount = Math.abs(Math.round(item.delta)).toLocaleString("ko-KR");
      const pct =
        item.pct == null
          ? "전월 실적 없음"
          : `${Math.abs(item.pct).toFixed(1)}%`;
      return `${item.label} ${amount}원 ${verb}(${pct})`;
    });
  const text =
    highlights.length > 0
      ? `${mom.previousLabel} 대비 ${highlights.join(", ")}.`
      : `${mom.previousLabel}과 주요 금액이 같습니다.`;
  return { up, down, flat, text };
}

function inMonth(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function isCancelled(row: DailySaleRow) {
  return displayShipmentType(row.shipmentType) === CANCELLED;
}

function isOpenReceivable(row: DailySaleRow) {
  return (
    row.shipmentType !== SALE_SHIPMENT_DONE &&
    !isCancelled(row) &&
    parseSaleMoney(row.remaining) > 0
  );
}

function rankBuyers(rows: DailySaleRow[]): MonthlyBuyerRank[] {
  const map = new Map<string, MonthlyBuyerRank>();
  for (const row of rows) {
    const current = map.get(row.buyerName) ?? {
      buyerName: row.buyerName,
      count: 0,
      total: 0,
      paid: 0,
      remaining: 0,
      profit: 0,
    };
    current.count += 1;
    current.total += parseSaleMoney(row.total);
    current.paid += parseSaleMoney(row.paidAmount);
    current.remaining += parseSaleMoney(row.remaining);
    current.profit += parseSaleMoney(row.profit);
    map.set(row.buyerName, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || b.profit - a.profit);
}

export function buildMonthlySalesReport(
  rows: DailySaleRow[],
  month: string,
  purchases: MonthPurchaseTotals = EMPTY_MONTH_PURCHASES,
): MonthlySalesReportData {
  const { start, end, days } = monthBounds(month);
  const monthIssued = rows.filter(
    (row) => row.currency === "KRW" && inMonth(row.issueDate, start, end),
  );
  const monthSales = monthIssued.filter((row) => !isCancelled(row));
  const monthReceivables = monthSales.filter(isOpenReceivable);
  const fxSalesRows = rows.filter(
    (row) =>
      row.currency !== "KRW" &&
      inMonth(row.issueDate, start, end) &&
      !isCancelled(row),
  );
  const fxOpen = fxSalesRows.filter(isOpenReceivable);
  const fxSalesKrw = fxSalesRows.reduce(
    (sum, row) => sum + parseSaleMoney(row.amountKrw),
    0,
  );
  const fxSales = sumSaleRows(
    fxSalesRows,
    fxSalesRows[0]?.currency ?? "USD",
  ).total;
  const sales = sumSaleRows(monthSales);
  const operatingProfit = sales.total + fxSalesKrw - purchases.cost;

  const dailyMap = new Map<string, MonthlyDayPoint>();
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    dailyMap.set(date, {
      date,
      day,
      sales: 0,
      profit: 0,
      paid: 0,
      remaining: 0,
      count: 0,
    });
  }
  for (const row of monthSales) {
    const point = dailyMap.get(row.issueDate);
    if (!point) continue;
    point.sales += parseSaleMoney(row.total);
    point.profit += parseSaleMoney(row.profit);
    point.paid += parseSaleMoney(row.paidAmount);
    point.remaining += parseSaleMoney(row.remaining);
    point.count += 1;
  }
  const daily = [...dailyMap.values()];

  const statusMap = new Map<string, MonthlyStatusShare>();
  for (const type of SALE_SHIPMENT_TYPES) {
    statusMap.set(type, { type, count: 0, total: 0 });
  }
  for (const row of monthIssued) {
    const type = displayShipmentType(row.shipmentType);
    const current = statusMap.get(type) ?? { type, count: 0, total: 0 };
    current.count += 1;
    current.total += parseSaleMoney(row.total);
    statusMap.set(type, current);
  }

  let peakSalesDate = start;
  let peakProfitDate = start;
  for (const point of daily) {
    if (point.sales > (dailyMap.get(peakSalesDate)?.sales ?? 0)) {
      peakSalesDate = point.date;
    }
    if (point.profit > (dailyMap.get(peakProfitDate)?.profit ?? 0)) {
      peakProfitDate = point.date;
    }
  }

  return {
    month,
    start,
    end,
    label: monthLabel(month),
    sales,
    salesCount: monthSales.length,
    monthReceivables: sumSaleRows(monthReceivables),
    monthReceivableCount: monthReceivables.length,
    outstanding: sumSaleRows(monthReceivables),
    outstandingCount: monthReceivables.length,
    fxRemaining: sumSaleRows(fxOpen, fxOpen[0]?.currency ?? "USD").remaining,
    fxCount: fxOpen.length,
    fxCurrency: fxSalesRows[0]?.currency ?? fxOpen[0]?.currency ?? "USD",
    daily,
    buyers: rankBuyers(monthSales).slice(0, 10),
    outstandingBuyers: rankBuyers(monthReceivables)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 10),
    statuses: [...statusMap.values()],
    peakSalesDate,
    peakProfitDate,
    purchases,
    fxSalesKrw,
    fxSalesCount: fxSalesRows.length,
    fxSales,
    operatingProfit,
  };
}
