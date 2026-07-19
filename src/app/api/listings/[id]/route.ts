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

    const manageImages = formData.get("manageImages") === "1";
    const keepImageIds = formData
      .getAll("keepImageIds")
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    let imageUpdate:
      | {
          images: {
            deleteMany: Record<string, never>;
            create: { url: string; sortOrder: number }[];
          };
        }
      | undefined;
    let orphanUrls: string[] = [];

    if (hasUpload || manageImages) {
      const previousUrls = existing.images.map((img) => img.url);
      const byId = new Map(existing.images.map((img) => [img.id, img]));
      const keptUrls = keepImageIds
        .map((id) => byId.get(id)?.url)
        .filter((url): url is string => Boolean(url));

      let ordered: string[];
      if (manageImages) {
        // Explicit keep list from editor (+ optional new uploads)
        ordered = coverUrl
          ? [coverUrl, ...keptUrls, ...galleryUrls]
          : [...keptUrls, ...galleryUrls];
      } else if (coverUrl && galleryUrls.length > 0) {
        ordered = [coverUrl, ...galleryUrls];
      } else if (coverUrl) {
        const existingGallery = existing.images.slice(1).map((img) => img.url);
        ordered = [coverUrl, ...existingGallery];
      } else {
        const existingCover = existing.images[0]?.url;
        ordered = existingCover
          ? [existingCover, ...galleryUrls]
          : galleryUrls;
      }

      // Deduplicate while preserving order
      ordered = ordered.filter(
        (url, index) => ordered.indexOf(url) === index,
      );

      if (ordered.length === 0) {
        return NextResponse.json(
          { error: "사진은 최소 1장 이상 남겨 주세요." },
          { status: 400 },
        );
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
