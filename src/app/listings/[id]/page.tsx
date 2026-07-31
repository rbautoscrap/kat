import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ImageGallery } from "@/components/ImageGallery";
import { ListingOwnerActions } from "@/components/ListingOwnerActions";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { PurchaseOfferPanel } from "@/components/PurchaseOfferPanel";
import { AdminListingCostPanel } from "@/components/admin/AdminListingCostPanel";
import { AdminPurchaseOffersPanel } from "@/components/admin/AdminPurchaseOffersPanel";
import { DownloadListingImagesButton } from "@/components/admin/DownloadListingImagesButton";
import { AuctionCountdown } from "@/components/AuctionCountdown";
import { LiveAuctionGatePanel } from "@/components/LiveAuctionGatePanel";
import { ListingContactLinks } from "@/components/ListingContactLinks";
import { auth, canAccessLiveAuctionAsSignedIn, isAdmin } from "@/lib/auth";
import {
  resolveSessionDbUser,
  userCanModifyListing,
} from "@/lib/listing-access";
import {
  isLiveAuctionEnded,
  LIVE_AUCTION_ENDED_MESSAGE,
} from "@/lib/live-auction";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_PATHS,
  formatDisplacementDisplay,
  formatFuelType,
  formatNotesDisplay,
  formatOdometerDisplay,
  formatTransmission,
  isPartsCategory,
  SALE_STATUS_LABELS,
  listingKakaoInquiryText,
  listingWhatsAppLink,
  youtubeEmbedUrl,
} from "@/lib/listings";
import { displayAccumulatedDays } from "@/lib/listing-actions";
import { recordListingView } from "@/lib/listing-views";
import {
  isMemberOutbidByOthers,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing) notFound();

  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  const canEdit = await userCanModifyListing(listing.authorId);
  const adminView = isAdmin(dbUser?.role ?? session?.user?.role);
  const isSignedIn = Boolean(dbUser?.id || session?.user?.id);

  // Admin opened the listing → clear "new offer" highlight on the admin list.
  if (adminView) {
    const latestOffer = await prisma.purchaseOffer.findFirst({
      where: { listingId: listing.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (
      latestOffer &&
      (!listing.offersSeenAt ||
        latestOffer.createdAt.getTime() > listing.offersSeenAt.getTime())
    ) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { offersSeenAt: new Date() },
      });
    }
  }

  if (
    listing.category === "LIVE_AUCTION" &&
    !canAccessLiveAuctionAsSignedIn(isSignedIn)
  ) {
    return (
      <LiveAuctionGatePanel
        callbackUrl={`/listings/${listing.id}`}
        backHref={CATEGORY_PATHS.LIVE_AUCTION}
      />
    );
  }

  const auctionEnded = isLiveAuctionEnded(listing);

  // Ended Live Auction: members cannot view; admins keep full access (offers).
  if (auctionEnded && !adminView) {
    return (
      <div className="site-container py-10" lang="en">
        <div className="mb-4">
          <BackButton href={CATEGORY_PATHS.LIVE_AUCTION} />
        </div>
        <div className="mx-auto max-w-lg rounded-sm border border-[var(--line)] bg-white px-6 py-10 text-center">
          <p className="text-[1.1rem] font-medium tracking-[0.14em] uppercase text-neutral-700">
            Auction ended
          </p>
          <p className="mt-3 text-[14px] leading-relaxed tracking-wide text-neutral-500">
            {LIVE_AUCTION_ENDED_MESSAGE}
          </p>
        </div>
      </div>
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

  // Admin-only analytics: one counted view per IP (never shown publicly).
  if (!adminView) {
    void recordListingView(listing.id);
  }

  // Own offers are loaded separately so they are never truncated by listing-wide limits.
  // Rival amounts stay server-side and only feed the outbid flag (never sent to the client).
  const [ownOfferRows, listingOffersForCompare] =
    isSignedIn && dbUser?.id
      ? await Promise.all([
          prisma.purchaseOffer.findMany({
            where: { listingId: listing.id, userId: dbUser.id },
            select: {
              id: true,
              amount: true,
              currency: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.purchaseOffer.findMany({
            where: { listingId: listing.id },
            select: {
              userId: true,
              amount: true,
              currency: true,
            },
          }),
        ])
      : [[], []];

  const ownOffers = ownOfferRows.map((o) => ({
    id: o.id,
    amount: o.amount,
    currency: o.currency as OfferCurrencyCode,
    createdAt: o.createdAt,
  }));

  const hasHigherOffer =
    Boolean(dbUser?.id) &&
    isMemberOutbidByOthers(
      dbUser!.id,
      ownOffers.map((o) => ({ amount: o.amount, currency: o.currency })),
      listingOffersForCompare.map((o) => ({
        userId: o.userId,
        amount: o.amount,
        currency: o.currency as OfferCurrencyCode,
      })),
    );

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
  const inquiryOptions = {
    listingId: listing.id,
    serialNumber: listing.serialNumber,
    vin: listing.vin,
    year: listing.year,
    make: listing.make,
    model: listing.model,
  };
  const wa = listingWhatsAppLink(
    listing.whatsappNumber,
    listing.title,
    inquiryOptions,
  );
  const kakaoInquiry = listingKakaoInquiryText(listing.title, inquiryOptions);

  const shortSpecs: { label: string; value: string }[] = isPartsCategory(
    listing.category,
  )
    ? [
        {
          label: "Part",
          value: listing.make || "—",
        },
        {
          label: "S/N",
          value: listing.serialNumber || "—",
        },
      ]
    : [
        { label: "VIN", value: listing.vin || "—" },
        { label: "Engine Mark", value: listing.engineMark || "—" },
        {
          label: "Displacement",
          value: formatDisplacementDisplay(listing.displacement) || "—",
        },
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
  const offerPanelVisible =
    isSignedIn && listing.saleStatus !== "SOLD" && !auctionEnded;
  const liveAuctionEndsAt =
    listing.category === "LIVE_AUCTION" && listing.auctionEndsAt
      ? listing.auctionEndsAt.toISOString()
      : null;
  const showTopAuctionCountdown = Boolean(liveAuctionEndsAt) && !offerPanelVisible;

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
          costPrice={listing.costPrice}
          accumulatedDays={accumulatedDays}
        />
      ) : null}

      {showTopAuctionCountdown ? (
        <AuctionCountdown
          endsAt={liveAuctionEndsAt!}
          emphasize={!adminView}
          className={adminView && auctionEnded ? "opacity-90" : undefined}
        />
      ) : null}

      <div className="mb-5 overflow-hidden rounded-sm border border-[var(--line)]">
        <div className="border-b border-[var(--line)] bg-neutral-50 px-2.5 py-2 sm:px-3">
          <ListingContactLinks
            whatsappHref={wa}
            inquiryText={kakaoInquiry}
          />
        </div>

        {/* Specs: paired rows (50/50). Notes full-width below. */}
        <div className="divide-y divide-[var(--line)] text-[12.5px] sm:text-[13px]">
          {Array.from(
            { length: Math.ceil(shortSpecs.length / 2) },
            (_, row) => {
              const left = shortSpecs[row * 2];
              const right = shortSpecs[row * 2 + 1];
              return (
                <div
                  key={left.label}
                  className="grid grid-cols-1 sm:grid-cols-2"
                >
                  <div className="grid min-h-[2.4rem] grid-cols-[6.75rem_minmax(0,1fr)] items-stretch sm:grid-cols-[7rem_minmax(0,1fr)] sm:border-r sm:border-[var(--line)]">
                    <dt className="flex items-center border-r border-[var(--line)] bg-neutral-50/90 px-2.5 py-2 font-medium tracking-wide text-neutral-500">
                      {left.label}
                    </dt>
                    <dd className="flex min-w-0 items-center px-2.5 py-2 tracking-wide text-neutral-700">
                      <span className="min-w-0 break-words whitespace-pre-wrap">
                        {left.value}
                      </span>
                    </dd>
                  </div>
                  {right ? (
                    <div className="grid min-h-[2.4rem] grid-cols-[6.75rem_minmax(0,1fr)] items-stretch border-t border-[var(--line)] sm:grid-cols-[7rem_minmax(0,1fr)] sm:border-t-0">
                      <dt className="flex items-center border-r border-[var(--line)] bg-neutral-50/90 px-2.5 py-2 font-medium tracking-wide text-neutral-500">
                        {right.label}
                      </dt>
                      <dd className="flex min-w-0 items-center px-2.5 py-2 tracking-wide text-neutral-700">
                        <span className="min-w-0 break-words whitespace-pre-wrap">
                          {right.value}
                        </span>
                      </dd>
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
              );
            },
          )}
          <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-start sm:grid-cols-[7rem_minmax(0,1fr)]">
            <div className="border-r border-[var(--line)] bg-neutral-50/90 px-2.5 py-2 font-medium tracking-wide text-neutral-500">
              Notes
            </div>
            <div className="min-w-0 break-words whitespace-pre-wrap px-2.5 py-2 leading-relaxed tracking-wide text-neutral-700">
              {notesValue}
            </div>
          </div>
        </div>
      </div>

      {/* Guests see nothing. Members see form or their own offer only. */}
      {offerPanelVisible ? (
        <div className="mb-5">
          <PurchaseOfferPanel
            listingId={listing.id}
            hasHigherOffer={hasHigherOffer}
            auctionEndsAt={liveAuctionEndsAt}
            ownOffers={ownOffers.map((o) => ({
              id: o.id,
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
        <AdminPurchaseOffersPanel
          offers={adminOffers.map((offer) => ({
            id: offer.id,
            amount: offer.amount,
            currency: offer.currency,
            createdAtLabel: offer.createdAt
              .toISOString()
              .slice(0, 16)
              .replace("T", " "),
            user: offer.user,
          }))}
        />
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
