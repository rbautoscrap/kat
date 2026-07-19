"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

export function ListingThumb({ src, alt, sizes, className }: Props) {
  const [failed, setFailed] = useState(false);
  const url = failed || !src ? "/placeholder-car.svg" : src;

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
      // /uploads are served from Volume via route handler — skip optimizer
      unoptimized={
        url.startsWith("http") ||
        url.startsWith("/uploads/") ||
        url.endsWith(".svg")
      }
    />
  );
}
