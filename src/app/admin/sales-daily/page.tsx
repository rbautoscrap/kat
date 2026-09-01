import { DailySalesReport } from "@/components/admin/DailySalesReport";
import { DailySalesToolbar } from "@/components/admin/DailySalesToolbar";
import { MonthlySalesReport } from "@/components/admin/MonthlySalesReport";
import { koreaTodayDate } from "@/lib/format-korea-time";
import { loadMonthPurchases, loadSaleRowsThrough } from "@/lib/sales-daily-load";
import {
  isSettledSaleRow,
  parseSalesDailyView,
  sortSaleRowsByRecentDate,
} from "@/lib/sales-daily";
import {
  attachMonthOverMonth,
  buildMonthlySalesReport,
  monthBounds,
  parseYearMonth,
  previousYearMonth,
} from "@/lib/sales-monthly";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string; view?: string; month?: string }>;
};

function parseDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return koreaTodayDate();
}

export default async function AdminDailySalesPage({ searchParams }: Props) {
  const params = await searchParams;
  const date = parseDate(params.date);
  const view = parseSalesDailyView(params.view);
  const month = parseYearMonth(params.month, date) || date.slice(0, 7);
  const prevMonth = previousYearMonth(month);
  const through = view === "month" ? monthBounds(month).end : date;
  const from =
    view === "month" ? monthBounds(prevMonth).start : undefined;
  const emptyPurchases = {
    count: 0,
    auction: 0,
    incidental: 0,
    cost: 0,
  };
  const [allRows, purchases, prevPurchases] = await Promise.all([
    loadSaleRowsThrough(through, from),
    view === "month" ? loadMonthPurchases(month) : Promise.resolve(emptyPurchases),
    view === "month"
      ? loadMonthPurchases(prevMonth)
      : Promise.resolve(emptyPurchases),
  ]);

  const daySales = allRows.filter(
    (row) =>
      row.issueDate === date &&
      ((row.source === "statement" && row.currency === "KRW") ||
        row.source === "invoice"),
  );
  const receivables = allRows.filter(
    (row) =>
      row.currency === "KRW" &&
      row.inReceivableLedger &&
      !isSettledSaleRow(row),
  );
  const fxReceivables = allRows.filter(
    (row) =>
      row.currency !== "KRW" &&
      row.inReceivableLedger &&
      !isSettledSaleRow(row),
  );
  const addableKrw = sortSaleRowsByRecentDate(
    allRows.filter((row) => row.currency === "KRW" && !row.inReceivableLedger),
  );
  const addableFx = sortSaleRowsByRecentDate(
    allRows.filter((row) => row.currency !== "KRW" && !row.inReceivableLedger),
  );
  const monthlyBase = buildMonthlySalesReport(allRows, month, purchases);
  const monthly =
    view === "month"
      ? attachMonthOverMonth(
          monthlyBase,
          buildMonthlySalesReport(allRows, prevMonth, prevPurchases),
        )
      : monthlyBase;

  return (
    <div className="daily-sales-page">
      <div className="daily-sales-head daily-sales-no-print">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-neutral-900">
            {view === "month"
              ? "월말보고서"
              : view === "recv"
                ? "미수금현황"
                : view === "fx"
                  ? "외화 미수금현황"
                  : "일일판매현황"}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            {view === "month"
              ? "선택한 달 1일부터 말일까지 거래명세서와 입고 매입비용을 기준으로 집계하고, 전월 대비 증감을 함께 보여 줍니다."
              : view === "recv"
                ? "미수 원장에 등록된 원화 항목만 보여 줍니다. 입금·분류를 수정하고 출력 또는 이미지로 저장하세요."
                : view === "fx"
                  ? "미수 원장에 등록된 외화 항목만 보여 줍니다. 입금·분류를 수정하고 출력 또는 이미지로 저장하세요."
                  : "오늘부터 작성한 거래명세서·해외 인보이스가 자동으로 반영됩니다. 미수·외화는 총액만 보여 주고, 상세 목록은 우측 아이콘에서 확인하세요."}
          </p>
        </div>
        <DailySalesToolbar date={date} month={month} view={view} />
      </div>

      {view === "month" ? (
        <MonthlySalesReport key={month} report={monthly} />
      ) : (
        <DailySalesReport
          key={`${view}-${date}`}
          date={date}
          focus={view === "recv" || view === "fx" ? view : undefined}
          daySales={daySales}
          receivables={receivables}
          fxReceivables={fxReceivables}
          addableKrw={addableKrw}
          addableFx={addableFx}
        />
      )}
    </div>
  );
}
