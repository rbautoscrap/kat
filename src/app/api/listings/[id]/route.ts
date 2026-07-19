import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toApiErrorMessage } from "@/lib/api-error";
import { requireListingModifier } from "@/lib/listing-access";
import {
  deleteUploadedFiles,
  formDataToListingInput,
  MAX_IMAGES_PER_LISTING,
  saveListingImageUploads,
  withPublicNotesTranslation,
} from "@/lib/listing-actions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireListingModifier(id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const existing = access.listing;

  try {
    const formData = await request.formData();
    const data = await withPublicNotesTranslation(
      formDataToListingInput(formData),
    );
    const { coverUrl, galleryUrls, hasUpload } =
      await saveListingImageUploads(formData);

    let imageUpdate:
      | {
          images: {
            deleteMany: Record<string, never>;
            create: { url: string; sortOrder: number }[];
          };
        }
      | undefined;
    let orphanUrls: string[] = [];

    if (hasUpload) {
      const existingCover = existing.images[0]?.url;
      const existingGallery = existing.images.slice(1).map((img) => img.url);
      const previousUrls = existing.images.map((img) => img.url);

      let ordered: string[];
      if (coverUrl && galleryUrls.length > 0) {
        ordered = [coverUrl, ...galleryUrls];
      } else if (coverUrl) {
        ordered = [coverUrl, ...existingGallery];
      } else {
        ordered = existingCover
          ? [existingCover, ...galleryUrls]
          : galleryUrls;
      }

      if (ordered.length > MAX_IMAGES_PER_LISTING) {
        return NextResponse.json(
          {
            error: `이미지는 최대 ${MAX_IMAGES_PER_LISTING}장까지 등록할 수 있습니다.`,
          },
          { status: 400 },
        );
      }

      const kept = new Set(ordered);
      orphanUrls = previousUrls.filter((url) => !kept.has(url));

      imageUpdate = {
        images: {
          deleteMany: {},
          create: ordered.map((url, i) => ({ url, sortOrder: i })),
        },
      };
    }

    await prisma.listing.update({
      where: { id },
      data: {
        ...data,
        ...imageUpdate,
      },
    });

    if (orphanUrls.length) {
      await deleteUploadedFiles(orphanUrls);
    }

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[PUT /api/listings/:id]", err);
    return NextResponse.json(
      {
        error: toApiErrorMessage(err, "매물 수정에 실패했습니다."),
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireListingModifier(id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const urls = access.listing.images.map((img) => img.url);
    await prisma.listing.delete({ where: { id } });
    await deleteUploadedFiles(urls);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/listings/:id]", err);
    return NextResponse.json(
      {
        error: toApiErrorMessage(err, "매물 삭제에 실패했습니다."),
      },
      { status: 400 },
    );
  }
}
