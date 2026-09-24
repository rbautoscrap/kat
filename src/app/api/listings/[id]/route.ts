import { NextResponse } from "next/server";
import { deleteListingById } from "@/lib/delete-listing";
import { revalidateListingSurfaces } from "@/lib/home-listings";
import { prisma } from "@/lib/prisma";
import { toApiErrorMessage } from "@/lib/api-error";
import { isAdmin } from "@/lib/auth";
import { requireListingModifier } from "@/lib/listing-access";
import {
  deleteUploadedFiles,
  formDataToListingInput,
  listingImageCreatesFromForm,
  maxImagesForCategory,
  saveListingImageUploads,
  withPublicNotesTranslation,
} from "@/lib/listing-actions";
import {
  listingImageGroupCategory,
  listingMovesWithImageGroup,
  resolveDisplayedImageGroup,
} from "@/lib/listing-images";
import {
  linkedMenusForWrite,
  parseLinkedMenus,
  serializeLinkedMenus,
} from "@/lib/listing-menus";

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
    const parsed = formDataToListingInput(formData);
    // Members may only keep Used Parts listings in that category.
    if (
      access.dbUser.role === "MEMBER" &&
      (existing.category !== "USED_PARTS" || parsed.category !== "USED_PARTS")
    ) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    // Skip external translate when notes unchanged (avoids long hangs on Railway)
    const notesUnchanged =
      (parsed.damages ?? null) === (existing.damages ?? null);
    const data = notesUnchanged
      ? {
          ...parsed,
          damagesEn: parsed.damages ? (existing.damagesEn ?? null) : null,
        }
      : await withPublicNotesTranslation(parsed);

    const maxImages = maxImagesForCategory(data.category ?? existing.category);
    const uploads = await saveListingImageUploads(formData, { maxImages });

    const manageImages = formData.get("manageImages") === "1";
    const keepImageIds = formData
      .getAll("keepImageIds")
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    let imageUpdate:
      | {
          images: {
            deleteMany: Record<string, never>;
            create: {
              url: string;
              sortOrder: number;
              group: number;
              isCover: boolean;
            }[];
          };
        }
      | undefined;
    let orphanUrls: string[] = [];
    let nextImageRows:
      | {
          url: string;
          sortOrder: number;
          group: number;
          isCover: boolean;
        }[]
      | undefined;

    if (uploads.grouped || uploads.hasUpload || manageImages) {
      const previousUrls = existing.images.map((img) => img.url);

      if (uploads.grouped) {
        nextImageRows = listingImageCreatesFromForm({
          existing: existing.images,
          formData,
          uploads,
        });
      } else {
        const byId = new Map(existing.images.map((img) => [img.id, img]));
        const keptUrls = keepImageIds
          .map((id) => byId.get(id)?.url)
          .filter((url): url is string => Boolean(url));

        let ordered: string[];
        if (manageImages) {
          ordered = uploads.coverUrl
            ? [uploads.coverUrl, ...keptUrls, ...uploads.galleryUrls]
            : [...keptUrls, ...uploads.galleryUrls];
        } else if (uploads.coverUrl && uploads.galleryUrls.length > 0) {
          ordered = [uploads.coverUrl, ...uploads.galleryUrls];
        } else if (uploads.coverUrl) {
          const existingGallery = existing.images.slice(1).map((img) => img.url);
          ordered = [uploads.coverUrl, ...existingGallery];
        } else {
          const existingCover = existing.images[0]?.url;
          ordered = existingCover
            ? [existingCover, ...uploads.galleryUrls]
            : uploads.galleryUrls;
        }

        ordered = ordered.filter(
          (url, index) => ordered.indexOf(url) === index,
        );
        nextImageRows = ordered.map((url, i) => ({
          url,
          sortOrder: i,
          group: 1,
          isCover: i === 0,
        }));
      }

      if (!nextImageRows.length) {
        return NextResponse.json(
          { error: "사진은 최소 1장 이상 남겨 주세요." },
          { status: 400 },
        );
      }

      if (
        data.category !== "USED_PARTS" &&
        existing.category !== "USED_PARTS" &&
        uploads.grouped &&
        !nextImageRows.some((row) => row.group === 1 && row.isCover)
      ) {
        return NextResponse.json(
          { error: "1그룹 대표 사진을 남겨 주세요." },
          { status: 400 },
        );
      }

      if (nextImageRows.length > maxImages) {
        return NextResponse.json(
          {
            error: `이미지는 최대 ${maxImages}장까지 등록할 수 있습니다.`,
          },
          { status: 400 },
        );
      }

      const kept = new Set(nextImageRows.map((row) => row.url));
      orphanUrls = previousUrls.filter((url) => !kept.has(url));

      imageUpdate = {
        images: {
          deleteMany: {},
          create: nextImageRows,
        },
      };
    }

    const displayedImageGroup = nextImageRows
      ? resolveDisplayedImageGroup(data.displayedImageGroup, nextImageRows)
      : data.category === "USED_PARTS"
        ? 1
        : resolveDisplayedImageGroup(
            data.displayedImageGroup,
            existing.images,
          );

    const requestedCategory = data.category ?? existing.category;
    const category = listingMovesWithImageGroup(requestedCategory)
      ? listingImageGroupCategory(displayedImageGroup)
      : data.category;

    await prisma.listing.update({
      where: { id },
      data: {
        ...data,
        category,
        displayedImageGroup,
        linkedMenus: linkedMenusForWrite(
          parseLinkedMenus(data.linkedMenus),
          requestedCategory,
          category,
        ),
        ...imageUpdate,
      },
    });

    if (orphanUrls.length) {
      await deleteUploadedFiles(orphanUrls);
    }

    revalidateListingSurfaces(id);
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

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireListingModifier(id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  if (!isAdmin(access.dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { displayedImageGroup?: unknown };
    const displayedImageGroup = resolveDisplayedImageGroup(
      body.displayedImageGroup,
      access.listing.images,
    );
    const category = listingMovesWithImageGroup(access.listing.category)
      ? listingImageGroupCategory(displayedImageGroup)
      : undefined;
    await prisma.listing.update({
      where: { id },
      data: {
        displayedImageGroup,
        ...(category
          ? {
              category,
              linkedMenus: serializeLinkedMenus(
                parseLinkedMenus(access.listing.linkedMenus),
                category,
              ),
            }
          : {}),
      },
    });
    revalidateListingSurfaces(id);
    return NextResponse.json({ displayedImageGroup, category });
  } catch (err) {
    console.error("[PATCH /api/listings/:id]", err);
    return NextResponse.json(
      {
        error: toApiErrorMessage(err, "노출 그룹을 바꾸지 못했습니다."),
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

  const result = await deleteListingById(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
