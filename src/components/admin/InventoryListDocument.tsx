import { formatCostWon } from "@/lib/inventory-cost";
import type { InventoryListReport } from "@/lib/inventory-list";

type Props = {
  report: InventoryListReport;
};

function CountLabel({ count, cost }: { count: number; cost: number }) {
  return (
    <span className="inventory-count">
      {count.toLocaleString("ko-KR")}대
      {cost > 0 ? ` · 원가 ${formatCostWon(cost)}` : ""}
    </span>
  );
}

export function InventoryListDocument({ report }: Props) {
  return (
    <div className="inventory-sheet">
      <header className="inventory-head">
        <p className="inventory-brand">KOREA AUTO TRADE</p>
        <h1>재고 리스트</h1>
        <p className="inventory-meta">
          충주·진천 입고지별 · 판매중 / 예약완료 / 판매완료
          <span> · </span>
          {report.generatedAt}
        </p>
        <p className="inventory-total">
          전체 {report.totalCount.toLocaleString("ko-KR")}대
          {report.totalCost > 0 ? ` · 원가 합계 ${formatCostWon(report.totalCost)}` : ""}
        </p>
      </header>

      {report.locations.map((location) => (
        <section key={location.location} className="inventory-location">
          <h2>
            {location.location}
            <CountLabel count={location.count} cost={location.costTotal} />
          </h2>

          {location.statuses.map((block) => (
            <div key={block.status} className="inventory-status">
              <h3>
                {block.label}
                <CountLabel count={block.count} cost={block.costTotal} />
              </h3>
              {block.rows.length === 0 ? (
                <p className="inventory-empty">해당 없음</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th className="is-num">No</th>
                      <th>차량명</th>
                      <th>구분</th>
                      <th>S/N</th>
                      <th>VIN</th>
                      <th>차량번호</th>
                      <th>입고일</th>
                      <th className="is-num">누적</th>
                      <th className="is-num">원가</th>
                      <th className="is-num">판매가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="is-num">{row.no}</td>
                        <td className="is-title">{row.title}</td>
                        <td>{row.categoryLabel}</td>
                        <td>{row.serialNumber}</td>
                        <td>{row.vin}</td>
                        <td>{row.vehicleNumber}</td>
                        <td>{row.inboundDate}</td>
                        <td className="is-num">{row.days}</td>
                        <td className="is-num">{row.costLabel}</td>
                        <td className="is-num">{row.salePriceLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
