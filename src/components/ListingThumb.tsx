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
      // Local /uploads go through Next image optimization (smaller payloads).
      unoptimized={url.startsWith("http") || url.endsWith(".svg")}
    />
  );
}
