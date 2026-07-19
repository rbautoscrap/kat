import { NextResponse } from "next/server";
import { canManageListings } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toApiErrorMessage } from "@/lib/api-error";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  formDataToListingInput,
  generateSerialNumber,
  MAX_IMAGES_PER_LISTING,
  saveListingImageUploads,
  withPublicNotesTranslation,
} from "@/lib/listing-actions";

export async function POST(request: Request) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !canManageListings(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const data = await withPublicNotesTranslation(
      formDataToListingInput(formData),
    );
    const { coverUrl, urls } = await saveListingImageUploads(formData);

    if (!coverUrl) {
      return NextResponse.json(
        { error: "대표(메인) 사진을 등록해 주세요." },
        { status: 400 },
      );
    }
    if (urls.length > MAX_IMAGES_PER_LISTING) {
      return NextResponse.json(
        {
          error: `이미지는 최대 ${MAX_IMAGES_PER_LISTING}장까지 등록할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    const listing = await prisma.listing.create({
      data: {
        ...data,
        serialNumber: generateSerialNumber(),
        authorId: dbUser.id,
        images: {
          create: urls.map((url, i) => ({ url, sortOrder: i })),
        },
      },
    });

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
