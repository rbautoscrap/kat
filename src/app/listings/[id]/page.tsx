import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ImageGallery } from "@/components/ImageGallery";
import { ListingOwnerActions } from "@/components/ListingOwnerActions";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { PurchaseOfferPanel } from "@/components/PurchaseOfferPanel";
import { auth, isAdmin } from "@/lib/auth";
import { userCanModifyListing } from "@/lib/listing-access";
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

  const session = await auth();
  const canEdit = await userCanModifyListing(listing.authorId);
  const adminView = isAdmin(session?.user?.role);
  const isSignedIn = Boolean(session?.user?.id);

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
    isSignedIn && session?.user?.id
      ? await prisma.purchaseOffer.findMany({
          where: {
            listingId: listing.id,
            userId: session.user.id,
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
          user: { select: { name: true, email: true } },
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

  const specs: { label: string; value: string }[] = [
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
      label: "Notes",
      value:
        formatNotesDisplay(listing.damages, listing.damagesEn) || "—",
    },
    {
      label: "Fuel Type",
      value: formatFuelType(listing.fuelType) || "—",
    },
  ];

  return (
    <div className="site-container py-8" lang="en">
      <div className="mb-4">
        <BackButton href={CATEGORY_PATHS[listing.category]} />
      </div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="site-heading min-w-0 max-w-4xl break-words text-[1.35rem] text-neutral-800 sm:text-[1.55rem]">
            {listing.title}
          </h1>
          {adminView ? (
            <div className="mt-3">
              <ListingSaleStatusControl
                listingId={listing.id}
                saleStatus={listing.saleStatus}
              />
            </div>
          ) : listing.saleStatus === "RESERVED" ||
            listing.saleStatus === "SOLD" ? (
            <p
              className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-[12.5px] font-medium tracking-[0.12em] uppercase ${
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

      <div className="mb-7 overflow-hidden rounded-sm border border-[var(--line)]">
        <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center gap-2.5 border-b border-[var(--line)] bg-neutral-50 p-5 text-center sm:border-r sm:border-b-0">
            {wa ? (
              <>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#25D366] px-4 py-3 text-[13.5px] font-medium tracking-wide text-white transition hover:brightness-95"
                >
                  WhatsApp
                </a>
                <p className="text-[12px] leading-relaxed tracking-wide text-neutral-500">
                  Click the green button to get the price.
                </p>
              </>
            ) : (
              <p className="text-[12.5px] leading-relaxed tracking-wide text-neutral-500">
                Contact details unavailable.
              </p>
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {specs.map((item, index) => {
              const total = specs.length;
              const isLeft = index % 2 === 0;
              const lastRowStart = total % 2 === 0 ? total - 2 : total - 1;
              const inLastRow = index >= lastRowStart;
              return (
                <div
                  key={item.label}
                  className={`grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] border-[var(--line)] text-[13px] sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:text-[13.5px] ${
                    inLastRow ? "" : "border-b"
                  } ${isLeft ? "sm:border-r" : ""}`}
                >
                  <dt className="border-r border-[var(--line)] bg-neutral-50/90 px-2.5 py-2.5 font-medium tracking-wide text-neutral-500 sm:px-3">
                    {item.label}
                  </dt>
                  <dd className="min-w-0 break-words whitespace-pre-wrap px-2.5 py-2.5 tracking-wide text-neutral-700 sm:px-3">
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      {/* Guests see nothing. Members see form or their own offer only. */}
      {isSignedIn && listing.saleStatus !== "SOLD" ? (
        <div className="mb-7">
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
        <section className="mb-7 rounded-sm border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="text-[15px] font-medium tracking-wide text-neutral-800">
              Purchase offers ({adminOffers.length})
            </h2>
            <p className="mt-1 text-[12.5px] tracking-wide text-neutral-500">
              Offer details are visible only to administrators and the member
              who submitted them.
            </p>
          </div>
          {adminOffers.length === 0 ? (
            <p className="px-5 py-6 text-[13.5px] tracking-wide text-neutral-500">
              No purchase offers yet.
            </p>
          ) : (
            <div className="admin-table-scroll overflow-x-auto">
              <table className="data-table">
                <colgroup>
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "26%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--line)] bg-neutral-50 text-[12px] tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium sm:px-5">Member</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Offer</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Currency</th>
                    <th className="px-4 py-3 font-medium sm:px-5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOffers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="min-w-0 px-4 py-3.5 tracking-wide text-neutral-700 sm:px-5">
                        <span className="block truncate font-medium text-neutral-800">
                          {offer.user.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                          {offer.user.email}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium tracking-wide text-neutral-800 sm:px-5">
                        {formatOfferAmount(offer.amount, offer.currency)}
                      </td>
                      <td className="px-4 py-3.5 tracking-wide text-neutral-600 sm:px-5">
                        {offer.currency}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap tracking-wide text-neutral-500 sm:px-5">
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
        <div className="mb-7 aspect-video w-full overflow-hidden rounded-sm border border-[var(--line)] bg-black">
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
          <h2 className="site-heading mb-3 text-[15px] text-neutral-800">
            Photos
          </h2>
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
