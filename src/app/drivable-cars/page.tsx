import type { Metadata } from "next";
import type { Listing, ListingImage } from "@prisma/client";
import { BackButton } from "@/components/BackButton";
import { ListingCard } from "@/components/ListingCard";
import { ListingPagination } from "@/components/ListingPagination";
import { parsePage } from "@/lib/admin-pagination";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import { prisma } from "@/lib/prisma";
import {
  DRIVABLE_CARS_GRID_CLASS,
  DRIVABLE_CARS_PAGE_SIZE,
} from "@/lib/listings";
import { publicMenuWhere } from "@/lib/listing-menus";
import { LISTING_CARD_COVER_INCLUDE } from "@/lib/listing-images";
import { compareListingsForDisplay, orderByIds } from "@/lib/listing-shuffle";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drivable Cars",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

type ListingWithCover = Listing & { images: ListingImage[] };

export default async function DrivableCarsPage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  const canViewSold = isAdmin(dbUser?.role);
  const isSignedIn = Boolean(dbUser?.id);
  const page = parsePage(params.page);
  const pageSize = DRIVABLE_CARS_PAGE_SIZE;

  const where: Prisma.ListingWhereInput = {
    AND: [
      publicMenuWhere("DRIVABLE_CARS"),
      canViewSold ? {} : memberListingVisibilityWhere(),
    ],
  };

  let total = 0;
  let currentPage = page;
  let listings: ListingWithCover[] = [];
  let loadError = false;

  try {
    total = await prisma.listing.count({ where });
    const totalPageCount = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.min(page, totalPageCount);
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
    if (pageIds.length > 0) {
      const pageRows = await prisma.listing.findMany({
        where: { id: { in: pageIds } },
        include: LISTING_CARD_COVER_INCLUDE,
      });
      listings = orderByIds(pageRows, pageIds);
    }
  } catch (error) {
    console.error("[DrivableCarsPage] query failed", error);
    loadError = true;
  }

  return (
    <div className="site-container py-6 sm:py-8" lang="en">
      <div className="mb-3 sm:mb-4">
        <BackButton href="/" />
      </div>
      <div className="mb-6 sm:mb-8">
        <h1 className="site-heading text-[1.1rem] text-neutral-800 sm:text-[1.2rem]">
          Drivable Cars
        </h1>
        <p className="mt-1 text-[12.5px] tracking-wide text-neutral-500">
          Road-legal vehicles in Korea.
        </p>
      </div>
      {loadError ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          Listings are temporarily unavailable.
        </p>
      ) : listings.length === 0 ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          No cars listed yet.
        </p>
      ) : (
        <>
          <div className={DRIVABLE_CARS_GRID_CLASS}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                size="large"
                canViewSold={canViewSold}
                isSignedIn={isSignedIn}
              />
            ))}
          </div>
          {total > pageSize ? (
            <ListingPagination
              basePath="/drivable-cars"
              page={currentPage}
              total={total}
              pageSize={pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
