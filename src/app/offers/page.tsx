import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { MyOffersList } from "@/components/MyOffersList";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { loadMyOfferListings, parseMyOfferTab } from "@/lib/my-offers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MyOffersPage({ searchParams }: Props) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    redirect("/login?callbackUrl=/offers");
  }

  const params = await searchParams;
  const tab = parseMyOfferTab(params.tab);
  const allRows = await loadMyOfferListings(dbUser.id);

  const openRows = allRows.filter((r) => r.bucket === "open");
  const closedRows = allRows.filter((r) => r.bucket === "closed");
  const rows =
    tab === "closed" ? closedRows : tab === "all" ? allRows : openRows;

  return (
    <div className="site-container py-6 sm:py-8" lang="en">
      <div className="mb-3 sm:mb-4">
        <BackButton href="/" />
      </div>
      <div className="mb-5 sm:mb-6">
        <h1 className="site-heading text-[1.15rem] text-neutral-800 sm:text-[1.25rem]">
          My offers
        </h1>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed tracking-wide text-neutral-500">
          Track purchase offers by listing. Other members&apos; amounts stay
          private — you only see when you have been outbid.
        </p>
      </div>
      <MyOffersList
        rows={rows}
        tab={tab}
        counts={{
          open: openRows.length,
          closed: closedRows.length,
          all: allRows.length,
        }}
      />
    </div>
  );
}
