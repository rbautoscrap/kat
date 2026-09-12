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
            충주·진천 입고지의 판매중 재고를 보여 줍니다. 라이브 경매는 제외합니다.
            위탁 판매·예약완료·판매완료는 아이콘을 눌러 펼칩니다. 사업소별
            원가·누적 아이콘으로 정렬한 뒤 PDF로 저장할 수 있습니다.
          </p>
        </div>
        <InventoryPdfButton />
      </div>
      <div className="overflow-x-auto rounded-sm border border-[var(--line)] bg-white">
        <InventoryListDocument report={report} />
      </div>
    </div>
  );
}
