import Link from "next/link";
import { notFound } from "next/navigation";
import { StatementActions } from "@/components/admin/StatementActions";
import { StatementForm } from "@/components/admin/StatementForm";
import { StatementPreviewPanel } from "@/components/admin/StatementPreviewPanel";
import { prisma } from "@/lib/prisma";
import { defaultIssueDate, type ListingOption } from "@/lib/statement";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StatementDetailPage({ params }: Props) {
  const { id } = await params;
  const statement = await prisma.transactionStatement.findUnique({
    where: { id },
  });
  if (!statement) notFound();

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

  if (!options.some((o) => o.id === statement.listingId)) {
    options.unshift({
      id: statement.listingId,
      serialNumber: statement.serialNumber,
      label: statement.vehicleLabel,
      vin: statement.vin,
      vehicleNumber: statement.vehicleNumber,
    });
  }

  return (
    <div className="space-y-6">
      <div className="statement-no-print rounded-sm border border-[var(--line)] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
          <div>
            <Link
              href="/admin/statements"
              className="text-[13px] tracking-wide text-neutral-500 transition hover:text-neutral-800"
            >
              ← 목록
            </Link>
            <h2 className="mt-2 text-[15px] font-medium tracking-wide text-neutral-800">
              {statement.statementNo}
            </h2>
            <p className="mt-1 text-[12.5px] tracking-wide text-neutral-500">
              수정 저장 후, 아래에서 한국어/영문 전환 · 출력 · 이미지 저장이
              가능합니다.
            </p>
          </div>
          <StatementActions
            statementId={statement.id}
            statementNo={statement.statementNo}
          />
        </div>
        <div className="px-4 py-5 sm:px-5">
          <StatementForm
            mode="edit"
            listings={options}
            initial={statement}
            defaultIssueDate={defaultIssueDate()}
          />
        </div>
      </div>

      <StatementPreviewPanel statement={statement} />
    </div>
  );
}
