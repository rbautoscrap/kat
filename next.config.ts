import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "archiver",
    "archiver-utils",
    "zip-stream",
    "compress-commons",
    "crc32-stream",
    "crc-32",
    "lazystream",
    "readdir-glob",
    "tar-stream",
    "unzipper",
  ],
  experimental: {
    // Large backup ZIP restore over Railway (volume ~250GB).
    proxyClientMaxBodySize: "50gb",
    serverActions: {
      bodySizeLimit: "50gb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Listing grids must refresh immediately after a new registration.
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/listings",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/listings/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, must-revalidate",
          },
        ],
      },
      {
        // UUID-named uploads are immutable; long cache cuts repeat bandwidth.
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Favicon must refresh after brand updates (avoid long-lived edge cache).
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
      {
        source: "/favicon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
      {
        source: "/brand/favicon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
