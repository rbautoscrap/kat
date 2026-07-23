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
  ],
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
        // UUID-named uploads are immutable; long cache cuts repeat bandwidth.
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
