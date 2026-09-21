export const LISTING_IMAGE_GROUPS = [1, 2] as const;
export type ListingImageGroup = (typeof LISTING_IMAGE_GROUPS)[number];

export const MAX_COVER_IMAGES_PER_GROUP = 1;
export const MAX_DETAIL_IMAGES_PER_GROUP = 70;
export const MAX_IMAGES_PER_GROUP =
  MAX_COVER_IMAGES_PER_GROUP + MAX_DETAIL_IMAGES_PER_GROUP;

export type ListingImageFields = {
  id?: string;
  url: string;
  sortOrder?: number | null;
  group?: number | null;
  isCover?: boolean | null;
};

export type ListingImageCreateRow = {
  url: string;
  sortOrder: number;
  group: number;
  isCover: boolean;
};

export type GroupUpload = {
  coverUrl: string | null;
  galleryUrls: string[];
};

export function parseListingImageGroup(value: unknown): ListingImageGroup {
  return Number(value) === 2 ? 2 : 1;
}

export function listingImageGroupLabel(group: number): string {
  return parseListingImageGroup(group) === 2
    ? "2그룹 (Car Listings)"
    : "1그룹 (Stand by)";
}

export function imageGroupOf(image: {
  group?: number | null;
}): ListingImageGroup {
  return image.group === 2 ? 2 : 1;
}

function sortGroupImages<T extends ListingImageFields>(images: T[]): T[] {
  return [...images].sort((a, b) => {
    const coverDelta = Number(Boolean(b.isCover)) - Number(Boolean(a.isCover));
    if (coverDelta !== 0) return coverDelta;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function splitListingImages<T extends ListingImageFields>(
  images: T[] | null | undefined,
): Record<ListingImageGroup, T[]> {
  const grouped: Record<ListingImageGroup, T[]> = { 1: [], 2: [] };
  for (const image of images ?? []) {
    grouped[imageGroupOf(image)].push(image);
  }
  return {
    1: sortGroupImages(grouped[1]),
    2: sortGroupImages(grouped[2]),
  };
}

export function imagesForDisplayGroup<T extends ListingImageFields>(
  images: T[] | null | undefined,
  displayedGroup?: number | null,
): T[] {
  const grouped = splitListingImages(images);
  const preferred = parseListingImageGroup(displayedGroup);
  if (grouped[preferred].length > 0) return grouped[preferred];
  if (grouped[1].length > 0) return grouped[1];
  return grouped[2];
}

export function listingCardCoverUrl(
  images: ListingImageFields[] | null | undefined,
  displayedGroup?: number | null,
): string | undefined {
  const set = imagesForDisplayGroup(images, displayedGroup);
  const cover = set.find((image) => image.isCover) ?? set[0];
  return cover?.url;
}

export function assembleListingImageCreates(args: {
  existing: ListingImageFields[];
  uploads: Record<ListingImageGroup, GroupUpload>;
  keepCoverId: Record<ListingImageGroup, string | null>;
  keepGalleryIds: Record<ListingImageGroup, string[]>;
}): ListingImageCreateRow[] {
  const byId = new Map(args.existing.map((image) => [image.id, image]));
  const rows: ListingImageCreateRow[] = [];

  for (const group of LISTING_IMAGE_GROUPS) {
    const keepCover = args.keepCoverId[group]
      ? byId.get(args.keepCoverId[group]!)?.url
      : undefined;
    let coverUrl = args.uploads[group].coverUrl ?? keepCover ?? null;
    const galleryUrls = [
      ...args.keepGalleryIds[group]
        .map((id) => byId.get(id)?.url)
        .filter((url): url is string => Boolean(url)),
      ...args.uploads[group].galleryUrls,
    ];

    if (!coverUrl && galleryUrls.length > 0) {
      coverUrl = galleryUrls.shift() ?? null;
    }
    if (!coverUrl) continue;

    rows.push({ url: coverUrl, sortOrder: 0, group, isCover: true });
    galleryUrls.forEach((url, index) => {
      if (url === coverUrl) return;
      rows.push({
        url,
        sortOrder: index + 1,
        group,
        isCover: false,
      });
    });
  }

  return rows.filter(
    (row, index, list) =>
      list.findIndex((item) => item.url === row.url && item.group === row.group) ===
      index,
  );
}

export function resolveDisplayedImageGroup(
  requested: unknown,
  rows: { group: number }[],
): ListingImageGroup {
  const preferred = parseListingImageGroup(requested);
  const hasGroup = (group: ListingImageGroup) =>
    rows.some((row) => row.group === group);
  if (hasGroup(preferred)) return preferred;
  return hasGroup(1) ? 1 : 2;
}

/** Card/home queries: both group covers first, then pick by displayedImageGroup. */
export const LISTING_CARD_COVER_INCLUDE = {
  images: {
    orderBy: [
      { isCover: "desc" as const },
      { group: "asc" as const },
      { sortOrder: "asc" as const },
    ],
    take: 4,
  },
};
