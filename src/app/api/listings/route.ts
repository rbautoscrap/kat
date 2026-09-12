import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canCreateListing } from "@/lib/auth";
import { invalidateHomeListingsCache } from "@/lib/home-listings";
import { prisma } from "@/lib/prisma";
import { toApiErrorMessage } from "@/lib/api-error";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { koreaTodayYyyymmdd } from "@/lib/format-korea-time";
import {
  formDataToListingInput,
  generateSerialNumber,
  maxImagesForCategory,
  saveListingImageUploads,
  withPublicNotesTranslation,
} from "@/lib/listing-actions";

export async function POST(request: Request) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const parsed = formDataToListingInput(formData);
    if (parsed.category !== "USED_PARTS" && !parsed.inboundDate) {
      parsed.inboundDate = koreaTodayYyyymmdd();
      parsed.accumulatedDays = "0";
    }
    const data = await withPublicNotesTranslation(parsed);
    if (!canCreateListing(dbUser.role, data.category)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const maxImages = maxImagesForCategory(data.category);
    const { coverUrl, urls } = await saveListingImageUploads(formData, {
      maxImages,
    });

    if (!coverUrl) {
      return NextResponse.json(
        { error: "대표(메인) 사진을 등록해 주세요." },
        { status: 400 },
      );
    }
    if (urls.length > maxImages) {
      return NextResponse.json(
        {
          error: `이미지는 최대 ${maxImages}장까지 등록할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    const listing = await prisma.listing.create({
      data: {
        ...data,
        serialNumber: generateSerialNumber(),
        authorId: dbUser.id,
        // 24h front placement so the new unit shows on home + category first page.
        bumpedAt: new Date(),
        images: {
          create: urls.map((url, i) => ({ url, sortOrder: i })),
        },
      },
    });

    invalidateHomeListingsCache();
    revalidatePath("/");
    revalidatePath("/listings");
    return NextResponse.json({ id: listing.id });
  } catch (err) {
    console.error("[POST /api/listings]", err);
    return NextResponse.json(
      {
        error: toApiErrorMessage(err, "매물 등록에 실패했습니다."),
      },
      { status: 400 },
    );
  }
}
