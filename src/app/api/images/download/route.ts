import { NextResponse } from "next/server";
import {
  canAccessLiveAuctionAsSignedIn,
  isAdmin,
} from "@/lib/auth";
import { isLiveAuctionEnded } from "@/lib/live-auction";
import { prisma } from "@/lib/prisma";
import {
  compressImageForPublicDownload,
  loadListingImageBuffer,
  publicDownloadFilename,
} from "@/lib/public-image-download";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Compressed copy for members and visitors (not the original file). */
export async function GET(request: Request) {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`images:download:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }

  const image = await prisma.listingImage.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      sortOrder: true,
      listing: {
        select: {
          serialNumber: true,
          category: true,
          saleStatus: true,
          auctionEndsAt: true,
        },
      },
    },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const dbUser = await resolveSessionDbUser();
  const adminView = isAdmin(dbUser?.role);
  const listing = image.listing;

  if (
    listing.category === "LIVE_AUCTION" &&
    !canAccessLiveAuctionAsSignedIn(Boolean(dbUser))
  ) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (isLiveAuctionEnded(listing) && !adminView) {
    return NextResponse.json({ error: "This listing is unavailable." }, { status: 404 });
  }

  if (listing.saleStatus === "SOLD" && !adminView) {
    return NextResponse.json({ error: "This listing is unavailable." }, { status: 404 });
  }

  try {
    const original = await loadListingImageBuffer(image.url);
    if (!original) {
      return NextResponse.json(
        { error: "Image file was not found." },
        { status: 404 },
      );
    }
    const compressed = await compressImageForPublicDownload(original);
    const filename = publicDownloadFilename(
      listing.serialNumber,
      image.sortOrder,
      image.id,
    );
    return new NextResponse(new Uint8Array(compressed), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[GET /api/images/download]", error);
    return NextResponse.json(
      { error: "Could not prepare the photo." },
      { status: 500 },
    );
  }
}
