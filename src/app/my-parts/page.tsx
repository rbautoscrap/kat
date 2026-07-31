import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { MyPartsList } from "@/components/MyPartsList";
import { canListUsedParts } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { loadMyPartsListings, parseMyPartsTab } from "@/lib/my-parts";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MyPartsPage({ searchParams }: Props) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    redirect("/login?callbackUrl=/my-parts");
  }
  if (!canListUsedParts(dbUser.role)) {
    redirect("/?error=unauthorized");
  }

  const params = await searchParams;
  const tab = parseMyPartsTab(params.tab);
  const allRows = await loadMyPartsListings(dbUser.id);

  const availableRows = allRows.filter((r) => r.saleStatus === "AVAILABLE");
  const reservedRows = allRows.filter((r) => r.saleStatus === "RESERVED");
  const soldRows = allRows.filter((r) => r.saleStatus === "SOLD");
  const rows =
    tab === "available"
      ? availableRows
      : tab === "reserved"
        ? reservedRows
        : tab === "sold"
          ? soldRows
          : allRows;

  return (
    <div className="site-container py-6 sm:py-8" lang="en">
      <div className="mb-3 sm:mb-4">
        <BackButton href="/" />
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="site-heading text-[1.15rem] text-neutral-800 sm:text-[1.25rem]">
            My parts
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed tracking-wide text-neutral-500">
            Manage the used parts you have listed. Update details or sale
            status anytime.
          </p>
        </div>
        <Link
          href="/listings/new?category=USED_PARTS"
          className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-3.5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
        >
          + List a part
        </Link>
      </div>
      <MyPartsList
        rows={rows}
        tab={tab}
        counts={{
          available: availableRows.length,
          reserved: reservedRows.length,
          sold: soldRows.length,
          all: allRows.length,
        }}
      />
    </div>
  );
}
