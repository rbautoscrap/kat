"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import { AuctionImageBadge } from "@/components/AuctionImageBadge";
import { DownloadPhotoButton } from "@/components/DownloadPhotoButton";
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = images.find((img) => img.id === activeId) ?? null;

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

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
        {images.map((img, index) => (
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
                // /uploads are served from Volume via route handler — skip optimizer
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
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
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
