import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ImageGallery } from "@/components/ImageGallery";
import { ListingOwnerActions } from "@/components/ListingOwnerActions";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { PurchaseOfferPanel } from "@/components/PurchaseOfferPanel";
import { AdminListingCostPanel } from "@/components/admin/AdminListingCostPanel";
import { DownloadListingImagesButton } from "@/components/admin/DownloadListingImagesButton";
import { LiveAuctionGatePanel } from "@/components/LiveAuctionGatePanel";
import { canAccessLiveAuction, isAdmin } from "@/lib/auth";
import {
  resolveSessionDbUser,
  userCanModifyListing,
} from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_PATHS,
  formatFuelType,
  formatNotesDisplay,
  formatOdometerDisplay,
  formatTransmission,
  SALE_STATUS_LABELS,
  whatsappLink,
  youtubeEmbedUrl,
} from "@/lib/listings";
import { displayAccumulatedDays } from "@/lib/listing-actions";
import { formatOfferAmount } from "@/lib/purchase-offer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing) notFound();

  const dbUser = await resolveSessionDbUser();
  const canEdit = await userCanModifyListing(listing.authorId);
  const adminView = isAdmin(dbUser?.role);
  const isSignedIn = Boolean(dbUser?.id);

  if (
    listing.category === "LIVE_AUCTION" &&
    !canAccessLiveAuction(dbUser?.role)
  ) {
    return (
      <LiveAuctionGatePanel
        callbackUrl={`/listings/${listing.id}`}
        backHref={CATEGORY_PATHS.LIVE_AUCTION}
      />
    );
  }

  // Sold listings: detail view for administrators only
  if (listing.saleStatus === "SOLD" && !adminView) {
    return (
      <div className="site-container py-10" lang="en">
        <div className="mb-4">
          <BackButton href={CATEGORY_PATHS[listing.category]} />
        </div>
        <div className="mx-auto max-w-lg rounded-sm border border-[var(--line)] bg-white px-6 py-10 text-center">
          <p className="text-[1.1rem] font-medium tracking-[0.14em] uppercase text-neutral-700">
            Sold out
          </p>
          <p className="mt-3 text-[14px] leading-relaxed tracking-wide text-neutral-500">
            This vehicle has been sold and is no longer available for detailed
            viewing.
          </p>
        </div>
      </div>
    );
  }

  // Offer amounts are private: only the submitting member (own offers) and admins.
  const ownOffers =
    isSignedIn && dbUser?.id
      ? await prisma.purchaseOffer.findMany({
          where: {
            listingId: listing.id,
            userId: dbUser.id,
          },
          select: { amount: true, currency: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : [];

  const adminOffers = adminView
    ? await prisma.purchaseOffer.findMany({
        where: { listingId: listing.id },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const embed = youtubeEmbedUrl(listing.youtubeUrl);
  const wa = whatsappLink(
    listing.whatsappNumber,
    `Inquiry about ${listing.title}`,
  );

  const shortSpecs: { label: string; value: string }[] = [
    { label: "VIN", value: listing.vin || "—" },
    { label: "Engine Mark", value: listing.engineMark || "—" },
    {
      label: "Transmission",
      value: formatTransmission(listing.transmission) || "—",
    },
    {
      label: "Odometer",
      value: formatOdometerDisplay(listing.odometer) || "—",
    },
    {
      label: "Fuel Type",
      value: formatFuelType(listing.fuelType) || "—",
    },
  ];
  const notesValue =
    formatNotesDisplay(listing.damages, listing.damagesEn) || "—";

  const accumulatedDays = displayAccumulatedDays(listing);

  return (
    <div className="site-container py-6 sm:py-7" lang="en">
      <div className="mb-3">
        <BackButton href={CATEGORY_PATHS[listing.category]} />
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="site-heading min-w-0 max-w-4xl break-words text-[1.25rem] text-neutral-800 sm:text-[1.4rem]">
            {listing.title}
          </h1>
          {adminView ? (
            <div className="mt-2">
              <ListingSaleStatusControl
                listingId={listing.id}
                saleStatus={listing.saleStatus}
              />
            </div>
          ) : listing.saleStatus === "RESERVED" ||
            listing.saleStatus === "SOLD" ? (
            <p
              className={`mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[12px] font-medium tracking-[0.12em] uppercase ${
                listing.saleStatus === "SOLD"
                  ? "border-neutral-300 bg-neutral-100 text-neutral-700"
                  : "border-sky-200 bg-sky-50 text-sky-900"
              }`}
            >
              {SALE_STATUS_LABELS[listing.saleStatus]}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <ListingOwnerActions
            listingId={listing.id}
            categoryPath={CATEGORY_PATHS[listing.category]}
          />
        ) : null}
      </div>

      {adminView ? (
        <AdminListingCostPanel
          auctionPrice={listing.auctionPrice}
          incidentalCost={listing.incidentalCost}
          costPrice={listing.costPrice}
          accumulatedDays={accumulatedDays}
        />
      ) : null}

      <div className="mb-5 overflow-hidden rounded-sm border border-[var(--line)]">
        <div className="grid sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center gap-1.5 border-b border-[var(--line)] bg-neutral-50 px-3 py-3 text-center sm:border-r sm:border-b-0">
            {wa ? (
              <>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#25D366] px-3 py-2 text-[13px] font-medium tracking-wide text-white transition hover:brightness-95"
                >
                  WhatsApp
                </a>
                <p className="text-[11px] leading-snug tracking-wide text-neutral-500">
                  Click for price
                </p>
              </>
            ) : (
              <p className="text-[12px] leading-snug tracking-wide text-neutral-500">
                Contact unavailable
              </p>
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {shortSpecs.map((item, index) => {
              const total = shortSpecs.length;
              const isLeft = index % 2 === 0;
              const isLast = index === total - 1;
              const oddLoneLast = total % 2 === 1 && isLast;
              const lastRowStart = total % 2 === 0 ? total - 2 : total - 1;
              const inLastRow = index >= lastRowStart;
              return (
                <div
                  key={item.label}
                  className={`grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center border-[var(--line)] text-[12.5px] sm:grid-cols-[7rem_minmax(0,1fr)] sm:text-[13px] ${
                    inLastRow ? "" : "border-b"
                  } ${isLeft && !oddLoneLast ? "sm:border-r" : ""} ${
                    oddLoneLast ? "sm:col-span-2" : ""
                  }`}
                >
                  <dt className="border-r border-[var(--line)] bg-neutral-50/90 px-2 py-1.5 font-medium tracking-wide text-neutral-500 sm:px-2.5">
                    {item.label}
                  </dt>
                  <dd className="min-w-0 break-words whitespace-pre-wrap px-2 py-1.5 tracking-wide text-neutral-700 sm:px-2.5">
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Full-width Notes so long text does not stretch neighboring short cells. */}
        <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] border-t border-[var(--line)] text-[12.5px] sm:grid-cols-[7rem_minmax(0,1fr)] sm:text-[13px]">
          <div className="border-r border-[var(--line)] bg-neutral-50/90 px-2 py-1.5 font-medium tracking-wide text-neutral-500 sm:px-2.5">
            Notes
          </div>
          <div className="min-w-0 break-words whitespace-pre-wrap px-2 py-1.5 tracking-wide text-neutral-700 sm:px-2.5">
            {notesValue}
          </div>
        </div>
      </div>

      {/* Guests see nothing. Members see form or their own offer only. */}
      {isSignedIn && listing.saleStatus !== "SOLD" ? (
        <div className="mb-5">
          <PurchaseOfferPanel
            listingId={listing.id}
            ownOffers={ownOffers.map((o) => ({
              amount: o.amount,
              currency: o.currency,
              createdAt: o.createdAt
                .toISOString()
                .slice(0, 16)
                .replace("T", " "),
            }))}
          />
        </div>
      ) : null}

      {adminView ? (
        <section className="mb-5 rounded-sm border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-3.5 py-2.5 sm:px-4">
            <h2 className="text-[13.5px] font-medium tracking-wide text-neutral-800">
              Purchase offers ({adminOffers.length})
            </h2>
            <p className="mt-0.5 text-[11.5px] tracking-wide text-neutral-500">
              Offer amount and contact are admin-only.
            </p>
          </div>
          {adminOffers.length === 0 ? (
            <p className="px-3.5 py-4 text-[13px] tracking-wide text-neutral-500 sm:px-4">
              No purchase offers yet.
            </p>
          ) : (
            <div className="admin-table-scroll overflow-x-auto">
              <table className="data-table text-[12.5px] sm:text-[13px]">
                <colgroup>
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "22%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--line)] bg-neutral-50 text-[11.5px] tracking-wide text-neutral-500">
                    <th className="px-3 py-2 font-medium sm:px-4">Member</th>
                    <th className="px-3 py-2 font-medium sm:px-4">Contact</th>
                    <th className="px-3 py-2 font-medium sm:px-4">Offer</th>
                    <th className="px-3 py-2 font-medium sm:px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOffers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="min-w-0 px-3 py-2 tracking-wide text-neutral-700 sm:px-4">
                        <span className="block truncate font-medium text-neutral-800">
                          {offer.user.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-neutral-500">
                          {offer.user.email}
                        </span>
                      </td>
                      <td className="min-w-0 px-3 py-2 tracking-wide text-neutral-700 sm:px-4">
                        {offer.user.phone ? (
                          <a
                            href={`tel:${offer.user.phone}`}
                            className="block truncate font-medium tabular-nums text-neutral-800 hover:underline"
                          >
                            {offer.user.phone}
                          </a>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium tracking-wide tabular-nums text-neutral-800 sm:px-4">
                        {formatOfferAmount(offer.amount, offer.currency)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tracking-wide text-neutral-500 sm:px-4">
                        {offer.createdAt
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {embed && (
        <div className="mb-5 aspect-video w-full overflow-hidden rounded-sm border border-[var(--line)] bg-black">
          <iframe
            src={embed}
            title="Vehicle video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {listing.images.length > 0 && (
        <section className="w-full">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="site-heading text-[14px] text-neutral-800">
              Photos
            </h2>
            {adminView ? (
              <DownloadListingImagesButton
                listingId={listing.id}
                imageCount={listing.images.length}
              />
            ) : null}
          </div>
          <ImageGallery
            images={listing.images}
            alt={listing.title}
            saleStatus={listing.saleStatus}
          />
        </section>
      )}
    </div>
  );
}
