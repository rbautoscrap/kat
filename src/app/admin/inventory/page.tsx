import { InventoryListDocument } from "@/components/admin/InventoryListDocument";
import { InventoryPdfButton } from "@/components/admin/InventoryPdfButton";
import { loadInventoryListReport } from "@/lib/inventory-list";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const report = await loadInventoryListReport();

  return (
    <div className="inventory-print-root">
      <div className="inventory-no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            재고 리스트
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            충주·진천 입고지와 판매중 / 예약완료 / 판매완료를 나눠 보여 줍니다.
            PDF로 저장을 누르면 인쇄 창에서 대상만 PDF로 받으면 됩니다.
          </p>
        </div>
        <InventoryPdfButton />
      </div>
      <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-white">
        <InventoryListDocument report={report} />
      </div>
    </div>
  );
}
