import { BackButton } from "@/components/BackButton";
import { ListingCard } from "@/components/ListingCard";
import { ListingPagination } from "@/components/ListingPagination";
import { parsePage } from "@/lib/admin-pagination";
import { auth, isAdmin } from "@/lib/auth";
import { buildPublicListingSearchWhere } from "@/lib/listing-search";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  LISTING_CATEGORY_GRID_CLASS,
  LISTING_CATEGORY_PAGE_SIZE,
  LISTING_GRID_CLASS,
  parseCategory,
} from "@/lib/listings";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await auth();
  const canViewSold = isAdmin(session?.user?.role);
  const category = parseCategory(params.category ?? null);
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);

  const searchWhere = buildPublicListingSearchWhere(q);
  const categoryWhere: Prisma.ListingWhereInput = category
    ? { category }
    : {};

  const where: Prisma.ListingWhereInput = {
    AND: [categoryWhere, searchWhere],
  };

  const fromMenu = Boolean(category) && !q;
  const isSearch = Boolean(q);
  const pageSize = LISTING_CATEGORY_PAGE_SIZE;

  const total = await prisma.listing.count({ where });
  const totalPageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPageCount);

  const listings = await prisma.listing.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: (currentPage - 1) * pageSize,
  });

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
          for make, model, VIN, S/N
          {/^\d{1,3}$/.test(q) ? "" : ", or notes"}
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
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
