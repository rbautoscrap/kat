"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import { AuctionImageBadge } from "@/components/AuctionImageBadge";
import { ListingImageWatermark } from "@/components/ListingImageWatermark";
import { SaleStatusOverlay } from "@/components/SaleStatusOverlay";

type Props = {
  images: { id: string; url: string }[];
  alt: string;
  saleStatus?: ListingSaleStatus;
  category?: ListingCategory | null;
};

export function ImageGallery({
  images,
  alt,
  saleStatus = "AVAILABLE",
  category,
}: Props) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveUrl(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeUrl]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
        {images.map((img, index) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveUrl(img.url)}
            className="relative aspect-[4/3] cursor-zoom-in overflow-hidden bg-neutral-100"
            aria-label={`Enlarge photo ${index + 1}`}
          >
            <Image
              src={img.url}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="(max-width: 640px) 33vw, 20vw"
              draggable={false}
              className="object-cover"
              // /uploads are served from Volume via route handler — skip optimizer
              unoptimized={
                img.url.startsWith("http") || img.url.startsWith("/uploads/")
              }
            />
            {category === "CAR_LISTINGS" ? (
              <ListingImageWatermark size="detail" />
            ) : null}
            <SaleStatusOverlay status={saleStatus} size="detail" />
            {category === "LIVE_AUCTION" ? (
              <AuctionImageBadge size="detail" />
            ) : null}
          </button>
        ))}
      </div>

      {activeUrl && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={() => setActiveUrl(null)}
          aria-label="Close enlarged photo"
        >
          <span className="relative inline-flex max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={alt}
              draggable={false}
              data-protect-image=""
              className="max-h-full max-w-full object-contain"
            />
            {category === "CAR_LISTINGS" ? (
              <ListingImageWatermark size="lightbox" />
            ) : null}
          </span>
        </button>
      )}
    </>
  );
}
