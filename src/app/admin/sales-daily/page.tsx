import { DailySalesReport } from "@/components/admin/DailySalesReport";
import { DailySalesToolbar } from "@/components/admin/DailySalesToolbar";
import { MonthlySalesReport } from "@/components/admin/MonthlySalesReport";
import { koreaTodayDate } from "@/lib/format-korea-time";
import { loadSaleRowsThrough } from "@/lib/sales-daily-load";
import {
  isSettledSaleRow,
  sortSaleRowsByRecentDate,
} from "@/lib/sales-daily";
import {
  buildMonthlySalesReport,
  monthBounds,
  parseYearMonth,
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
  const view = params.view === "month" ? "month" : "daily";
  const month = parseYearMonth(params.month, date) || date.slice(0, 7);
  const through = view === "month" ? monthBounds(month).end : date;
  const allRows = await loadSaleRowsThrough(through);

  const daySales = allRows.filter(
    (row) =>
      row.issueDate === date &&
      row.currency === "KRW" &&
      row.source === "statement",
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
  const monthly = buildMonthlySalesReport(allRows, month);

  return (
    <div className="daily-sales-page">
      <div className="daily-sales-head daily-sales-no-print">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-neutral-900">
            {view === "month" ? "월말보고서" : "일일판매현황"}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            {view === "month"
              ? "선택한 달의 판매·영업이익·미수·구매자 순위를 한 화면에서 확인합니다."
              : "오늘부터 작성한 거래명세서·해외 인보이스가 자동으로 반영됩니다. 아래 미리보기에서 입금·분류를 수정하고 출력 또는 이미지로 저장하세요."}
          </p>
        </div>
        <DailySalesToolbar date={date} month={month} view={view} />
      </div>

      {view === "month" ? (
        <MonthlySalesReport key={month} report={monthly} />
      ) : (
        <DailySalesReport
          key={date}
          date={date}
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
