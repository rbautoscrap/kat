import Link from "next/link";
import { redirect } from "next/navigation";
import type { Listing, ListingImage } from "@prisma/client";
import { BackButton } from "@/components/BackButton";
import { ListingCard } from "@/components/ListingCard";
import { ListingPagination } from "@/components/ListingPagination";
import { parsePage } from "@/lib/admin-pagination";
import { canListUsedParts, isAdmin } from "@/lib/auth";
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
  USED_PARTS_LIST_CLASS,
  USED_PARTS_PAGE_SIZE,
} from "@/lib/listings";
import {
  compareListingsForDisplay,
  newListingShuffleSeed,
  orderByIds,
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

type ListingWithCover = Listing & { images: ListingImage[] };

const coverInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
};

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  const canViewSold = isAdmin(dbUser?.role);
  const canList = canListUsedParts(dbUser?.role);
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
  const isPartsGallery = category === "USED_PARTS";
  const pageSize = isPartsGallery
    ? USED_PARTS_PAGE_SIZE
    : LISTING_CATEGORY_PAGE_SIZE;
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

  let total = 0;
  let currentPage = page;
  let listings: ListingWithCover[] = [];
  let loadError = false;

  try {
    total = await prisma.listing.count({ where });
    const totalPageCount = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.min(page, totalPageCount);

    if (shuffleMode && shuffleSeed !== null) {
      const idRows = await prisma.listing.findMany({
        where,
        select: {
          id: true,
          costPrice: true,
          createdAt: true,
          saleStatus: true,
          bumpedAt: true,
        },
        orderBy: { id: "asc" },
      });
      const orderedIds = seededCostBiasedOrder(idRows, shuffleSeed);
      const pageIds = orderedIds.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      );
      if (pageIds.length === 0) {
        listings = [];
      } else {
        const pageRows = await prisma.listing.findMany({
          where: { id: { in: pageIds } },
          include: coverInclude,
        });
        listings = orderByIds(pageRows, pageIds);
      }
    } else {
      // Stand by / auction / search: honor 24h 상단 pins (bumpedAt), then newest.
      const idRows = await prisma.listing.findMany({
        where,
        select: {
          id: true,
          saleStatus: true,
          bumpedAt: true,
          createdAt: true,
        },
      });
      idRows.sort((a, b) => compareListingsForDisplay(a, b));
      const pageIds = idRows
        .slice((currentPage - 1) * pageSize, currentPage * pageSize)
        .map((r) => r.id);
      if (pageIds.length === 0) {
        listings = [];
      } else {
        const pageRows = await prisma.listing.findMany({
          where: { id: { in: pageIds } },
          include: coverInclude,
        });
        listings = orderByIds(pageRows, pageIds);
      }
    }
  } catch (error) {
    console.error("[ListingsPage] query failed", error);
    loadError = true;
    listings = [];
    total = 0;
    currentPage = 1;
  }

  const heading = category
    ? CATEGORY_LABELS[category]
    : q
      ? `Search: ${q}`
      : "All Listings";

  const useLargeGrid = fromMenu || isSearch;
  const listClass = isPartsGallery
    ? USED_PARTS_LIST_CLASS
    : useLargeGrid
      ? LISTING_CATEGORY_GRID_CLASS
      : LISTING_GRID_CLASS;

  return (
    <div className="site-container py-6 sm:py-8" lang="en">
      <div className="mb-3 sm:mb-4">
        <BackButton href="/" />
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <h1 className="site-heading text-[1.1rem] text-neutral-800 sm:text-[1.2rem]">
          {heading}
        </h1>
        {isPartsGallery && canList ? (
          <Link
            href="/listings/new?category=USED_PARTS"
            className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-3.5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
          >
            + List a part
          </Link>
        ) : null}
      </div>
      {isPartsGallery ? (
        <p className="-mt-3 mb-5 text-[13px] leading-relaxed tracking-wide text-red-600 sm:-mt-4 sm:mb-6">
          This message board is a open space for user-to-user transactions.
          Please note that &quot; Korea Auto Trade &quot; is not involved in any
          sales or transactions and assumes no liability for trading activities.
        </p>
      ) : null}
      {isSearch ? (
        <p className="-mt-4 mb-6 text-[13px] tracking-wide text-neutral-500">
          {total.toLocaleString("en-US")} result{total === 1 ? "" : "s"}
          {" "}
          {/^\d{1,4}$/.test(q)
            ? "for make / model"
            : "for make, model, VIN, S/N, or notes"}
        </p>
      ) : null}
      {loadError ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          Listings are temporarily unavailable. Please try again in a moment.
        </p>
      ) : listings.length === 0 ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          No listings found.
        </p>
      ) : (
        <>
          <div className={listClass}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                layout={isPartsGallery ? "list" : "grid"}
                size={isPartsGallery || useLargeGrid ? "large" : "default"}
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
