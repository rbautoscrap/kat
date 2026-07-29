import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ListingCard } from "@/components/ListingCard";
import { ListingPagination } from "@/components/ListingPagination";
import { parsePage } from "@/lib/admin-pagination";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import { buildPublicListingSearchWhere } from "@/lib/listing-search";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  LISTING_CATEGORY_GRID_CLASS,
  LISTING_CATEGORY_PAGE_SIZE,
  LISTING_GRID_CLASS,
  parseCategory,
} from "@/lib/listings";
import {
  newListingShuffleSeed,
  orderByIds,
  orderListingsNewestFirst,
  parseListingShuffleSeed,
  seededCostBiasedOrder,
} from "@/lib/listing-shuffle";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
    shuffle?: string;
  }>;
};

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  const canViewSold = isAdmin(dbUser?.role);
  const isSignedIn = Boolean(dbUser?.id);
  const category = parseCategory(params.category ?? null);
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);

  const searchWhere = buildPublicListingSearchWhere(q);
  const categoryWhere: Prisma.ListingWhereInput = category
    ? { category }
    : {};
  const visibilityWhere: Prisma.ListingWhereInput = canViewSold
    ? {}
    : memberListingVisibilityWhere();

  const where: Prisma.ListingWhereInput = {
    AND: [categoryWhere, searchWhere, visibilityWhere],
  };

  const fromMenu = Boolean(category) && !q;
  const isSearch = Boolean(q);
  const pageSize = LISTING_CATEGORY_PAGE_SIZE;
  /** Car Listings: cost-biased random order per visit. */
  const shuffleMode =
    category === "CAR_LISTINGS" ? ("cost_biased" as const) : null;

  let shuffleSeed: number | null = null;
  if (shuffleMode && category) {
    shuffleSeed = parseListingShuffleSeed(params.shuffle);
    if (shuffleSeed === null) {
      const sp = new URLSearchParams();
      sp.set("category", category);
      if (q) sp.set("q", q);
      if (page > 1) sp.set("page", String(page));
      sp.set("shuffle", String(newListingShuffleSeed()));
      redirect(`/listings?${sp.toString()}`);
    }
  }

  const total = await prisma.listing.count({ where });
  const totalPageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPageCount);

  const idSelect = {
    id: true,
    costPrice: true,
    createdAt: true,
    saleStatus: true,
    bumpedAt: true,
  } as const;

  let listings;
  if (shuffleMode && shuffleSeed !== null) {
    const idRows = await prisma.listing.findMany({
      where,
      select: idSelect,
      orderBy: { id: "asc" },
    });
    const orderedIds = seededCostBiasedOrder(idRows, shuffleSeed);
    const pageIds = orderedIds.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );
    const pageRows = await prisma.listing.findMany({
      where: { id: { in: pageIds } },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    listings = orderByIds(pageRows, pageIds);
  } else {
    const idRows = await prisma.listing.findMany({
      where,
      select: idSelect,
      orderBy: { id: "asc" },
    });
    const orderedIds = orderListingsNewestFirst(idRows);
    const pageIds = orderedIds.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );
    const pageRows = await prisma.listing.findMany({
      where: { id: { in: pageIds } },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    listings = orderByIds(pageRows, pageIds);
  }

  const heading = category
    ? CATEGORY_LABELS[category]
    : q
      ? `Search: ${q}`
      : "All Listings";

  const useLargeGrid = fromMenu || isSearch;

  return (
    <div className="site-container py-6 sm:py-8" lang="en">
      <div className="mb-3 sm:mb-4">
        <BackButton href="/" />
      </div>
      <h1 className="site-heading mb-5 text-[1.1rem] text-neutral-800 sm:mb-6 sm:text-[1.2rem]">
        {heading}
      </h1>
      {isSearch ? (
        <p className="-mt-4 mb-6 text-[13px] tracking-wide text-neutral-500">
          {total.toLocaleString("en-US")} result{total === 1 ? "" : "s"}
          {" "}
          {/^\d{1,4}$/.test(q)
            ? "for make / model"
            : "for make, model, VIN, S/N, or notes"}
        </p>
      ) : null}
      {listings.length === 0 ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          No listings found.
        </p>
      ) : (
        <>
          <div
            className={
              useLargeGrid ? LISTING_CATEGORY_GRID_CLASS : LISTING_GRID_CLASS
            }
          >
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                size={useLargeGrid ? "large" : "default"}
                canViewSold={canViewSold}
                canManageSaleStatus={canViewSold}
                isSignedIn={isSignedIn}
              />
            ))}
          </div>
          {total > pageSize ? (
            <ListingPagination
              basePath="/listings"
              page={currentPage}
              total={total}
              pageSize={pageSize}
              params={{
                category: category ?? undefined,
                q: q || undefined,
                shuffle:
                  shuffleSeed !== null ? String(shuffleSeed) : undefined,
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
