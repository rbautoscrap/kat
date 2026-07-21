import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  createListingImagesZipStream,
  zipDownloadFilename,
} from "@/lib/listing-images-zip";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/** Admin-only: download all photos for a listing as a ZIP. */
export async function GET(_request: Request, { params }: Params) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      serialNumber: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
  });

  if (!listing) {
    return NextResponse.json(
      { error: "매물을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (listing.images.length === 0) {
    return NextResponse.json(
      { error: "다운로드할 이미지가 없습니다." },
      { status: 404 },
    );
  }

  try {
    const { stream } = await createListingImagesZipStream(
      listing.images.map((img) => img.url),
    );
    const filename = zipDownloadFilename(listing.serialNumber, listing.id);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/listings/:id/images/zip]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "이미지 다운로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
