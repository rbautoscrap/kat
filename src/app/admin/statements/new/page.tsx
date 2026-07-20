import Link from "next/link";
import { StatementForm } from "@/components/admin/StatementForm";
import { prisma } from "@/lib/prisma";
import { defaultIssueDate, type ListingOption } from "@/lib/statement";

export const dynamic = "force-dynamic";

export default async function NewStatementPage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      serialNumber: true,
      year: true,
      make: true,
      model: true,
      vin: true,
      vehicleNumber: true,
    },
  });

  const options: ListingOption[] = listings.map((l) => ({
    id: l.id,
    serialNumber: l.serialNumber,
    label: `${l.year} ${l.make} ${l.model}`,
    vin: l.vin,
    vehicleNumber: l.vehicleNumber,
  }));

  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <Link
          href="/admin/statements"
          className="text-[13px] text-neutral-500 transition hover:text-neutral-800"
        >
          ← 목록
        </Link>
        <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-neutral-900">
          거래명세서 작성
        </h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          매물을 선택하면 차량 정보가 자동으로 반영됩니다.
        </p>
      </div>
      <div className="px-4 py-5 sm:px-5">
        {options.length === 0 ? (
          <p className="text-[13.5px] text-neutral-500">
            등록된 매물이 없습니다. 먼저 매물을 등록해 주세요.
          </p>
        ) : (
          <StatementForm
            mode="create"
            listings={options}
            defaultIssueDate={defaultIssueDate()}
          />
        )}
      </div>
    </div>
  );
}
