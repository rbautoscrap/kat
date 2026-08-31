import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/admin/InvoiceActions";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { InvoicePreviewPanel } from "@/components/admin/InvoicePreviewPanel";
import {
  defaultInvoiceDate,
  type InvoiceLineItem,
  type ListingOption,
} from "@/lib/overseas-invoice";
import { listingVehicleLabel } from "@/lib/listings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const invoice = await prisma.overseasInvoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      serialNumber: true,
      title: true,
      year: true,
      manufactureMonth: true,
      make: true,
      model: true,
      vin: true,
      vehicleNumber: true,
    },
  });

  const options: ListingOption[] = listings.map((l) => ({
    id: l.id,
    serialNumber: l.serialNumber,
    label: l.title || listingVehicleLabel(l),
    vin: l.vin,
    vehicleNumber: l.vehicleNumber,
  }));

  const ensureOption = (opt: ListingOption) => {
    if (!options.some((o) => o.id === opt.id)) {
      options.unshift(opt);
    }
  };

  for (const item of invoice.items) {
    if (item.isExtra || !item.listingId) continue;
    ensureOption({
      id: item.listingId,
      serialNumber: item.regNo ?? "—",
      label: item.description,
      vin: item.vin,
      vehicleNumber: item.regNo,
    });
  }

  const invoiceView = {
    ...invoice,
    items: invoice.items as InvoiceLineItem[],
  };

  return (
    <div className="space-y-6">
      <div className="invoice-no-print rounded-sm border border-[var(--line)] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
          <div>
            <Link
              href="/admin/invoices"
              className="text-[13px] text-neutral-500 transition hover:text-neutral-800"
            >
              ← 목록
            </Link>
            <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-neutral-900">
              {invoice.invoiceNo}
            </h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              수정 저장 후, 아래 미리보기에서 출력·이미지 저장이 가능합니다.
            </p>
          </div>
          <InvoiceActions invoiceId={invoice.id} />
        </div>
        <div className="px-4 py-5 sm:px-5">
          <InvoiceForm
            mode="edit"
            listings={options}
            initial={invoiceView}
            defaultInvoiceDate={defaultInvoiceDate()}
          />
        </div>
      </div>

      <InvoicePreviewPanel invoice={invoiceView} />
    </div>
  );
}
