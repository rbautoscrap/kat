"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import { AuctionImageBadge } from "@/components/AuctionImageBadge";
import { DownloadPhotoButton } from "@/components/DownloadPhotoButton";
import { ListingImageGroupToggle } from "@/components/ListingImageGroupToggle";
import { SaleStatusOverlay } from "@/components/SaleStatusOverlay";
import {
  imagesForDisplayGroup,
  LISTING_IMAGE_GROUPS,
  listingImageGroupLabel,
  parseListingImageGroup,
  splitListingImages,
  type ListingImageGroup,
} from "@/lib/listing-images";

type GalleryImage = { id: string; url: string; group?: number | null; isCover?: boolean | null };

type Props = {
  images: GalleryImage[];
  alt: string;
  saleStatus?: ListingSaleStatus;
  category?: ListingCategory | null;
  defaultGroup?: number | null;
  listingId?: string;
  persistDisplayGroup?: boolean;
};

export function ImageGallery({
  images,
  alt,
  saleStatus = "AVAILABLE",
  category,
  defaultGroup,
  listingId,
  persistDisplayGroup = false,
}: Props) {
  const router = useRouter();
  const grouped = useMemo(() => splitListingImages(images), [images]);
  const available = LISTING_IMAGE_GROUPS.filter(
    (group) => grouped[group].length > 0,
  );
  const [group, setGroup] = useState<ListingImageGroup>(() =>
    parseListingImageGroup(
      imagesForDisplayGroup(images, defaultGroup)[0]?.group ?? defaultGroup,
    ),
  );
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const next = parseListingImageGroup(
      imagesForDisplayGroup(images, defaultGroup)[0]?.group ?? defaultGroup,
    );
    setGroup(next);
  }, [images, defaultGroup]);

  const visible = grouped[group].length > 0 ? grouped[group] : images;
  const active = visible.find((img) => img.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  async function selectGroup(next: ListingImageGroup) {
    setGroup(next);
    setActiveId(null);
    if (!persistDisplayGroup || !listingId || next === group) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayedImageGroup: next }),
      });
      if (res.ok) router.refresh();
    } catch {
      /* keep local selection */
    } finally {
      setSaving(false);
    }
  }

  if (visible.length === 0) return null;

  return (
    <>
      {persistDisplayGroup && available.length > 1 ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ListingImageGroupToggle
            value={group}
            available={available}
            onChange={selectGroup}
            size="md"
          />
          <span className="text-[12px] tracking-wide text-neutral-500">
            {listingImageGroupLabel(group)} 대표·상세
            {saving
              ? " · 저장 중"
              : group === 2
                ? " · Car Listings로 이동"
                : " · Stand by로 이동"}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
        {visible.map((img, index) => (
          <div
            key={img.id}
            className="relative aspect-[4/3] overflow-hidden bg-neutral-100"
          >
            <button
              type="button"
              onClick={() => setActiveId(img.id)}
              className="absolute inset-0 cursor-zoom-in"
              aria-label={`Enlarge photo ${index + 1}`}
            >
              <Image
                src={img.url}
                alt={`${alt} ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 20vw"
                draggable={false}
                className="object-cover"
                unoptimized={
                  img.url.startsWith("http") || img.url.startsWith("/uploads/")
                }
              />
              <SaleStatusOverlay status={saleStatus} size="detail" />
              {category === "LIVE_AUCTION" ? (
                <AuctionImageBadge size="detail" />
              ) : null}
            </button>
            <DownloadPhotoButton
              imageId={img.id}
              className="absolute bottom-1 right-1 z-[2] inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm transition hover:bg-black/80 disabled:opacity-70 sm:h-8 sm:w-8"
            />
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo"
          onClick={() => setActiveId(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={alt}
            draggable={false}
            data-protect-image=""
            className="max-h-full max-w-full cursor-zoom-out object-contain"
          />
          <DownloadPhotoButton
            imageId={active.id}
            iconClassName="h-5 w-5"
            className="absolute right-4 top-4 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition hover:bg-black/85 disabled:opacity-70"
          />
        </div>
      )}
    </>
  );
}
