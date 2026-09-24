"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import type { Listing, ListingImage, ListingCategory } from "@prisma/client";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";
import { compressImagesForUpload } from "@/lib/browser-compress-image";
import { DEFAULT_LISTING_WHATSAPP } from "@/lib/contact";
import {
  AUCTION_TODAY_PRESETS,
  AUCTION_TOMORROW_PRESETS,
  defaultAuctionEndsLocal,
  formatAuctionEndsSummary,
  isAuctionPresetPast,
  nextAuctionPreset,
  resolveAuctionPreset,
  type AuctionPreset,
} from "@/lib/auction-clock";
import {
  koreaTodayYyyymmdd,
  parseAuctionEndsAtInput,
  toKoreaDatetimeLocalValue,
} from "@/lib/format-korea-time";
import { ListingMenuLinkFields } from "@/components/admin/ListingMenuLinks";
import { ListingImageGroupToggle } from "@/components/ListingImageGroupToggle";
import {
  menuCoveredByCategory,
  parseLinkedMenus,
  type LinkableMenu,
} from "@/lib/listing-menus";
import {
  formatRegistrationDate,
  isPartsCategory,
  isStockVehicleCategory,
  MAX_IMAGES_PER_USED_PARTS,
  parseListingYearInput,
  parseRegistrationDateInput,
} from "@/lib/listings";
import {
  LISTING_IMAGE_GROUPS,
  MAX_DETAIL_IMAGES_PER_GROUP,
  listingImageGroupCategory,
  listingImageGroupLabel,
  listingMovesWithImageGroup,
  parseListingImageGroup,
  splitListingImages,
  type ListingImageGroup,
} from "@/lib/listing-images";
import {
  STORAGE_LOCATIONS,
  canonicalizeStorageLocation,
} from "@/lib/storage-location";

const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif";

type VehicleGroupUi = {
  coverName: string | null;
  coverPreview: string | null;
  photoCount: number;
  keptCover: ListingImage | null;
  keptGallery: ListingImage[];
};

function emptyVehicleGroup(): VehicleGroupUi {
  return {
    coverName: null,
    coverPreview: null,
    photoCount: 0,
    keptCover: null,
    keptGallery: [],
  };
}

function vehicleGroupsFromListing(
  images: ListingImage[] | undefined,
): Record<ListingImageGroup, VehicleGroupUi> {
  const split = splitListingImages(images ?? []);
  const from = (imgs: ListingImage[]): VehicleGroupUi => {
    const cover = imgs.find((img) => img.isCover) ?? imgs[0] ?? null;
    return {
      ...emptyVehicleGroup(),
      keptCover: cover,
      keptGallery: cover ? imgs.filter((img) => img.id !== cover.id) : imgs,
    };
  };
  return { 1: from(split[1]), 2: from(split[2]) };
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function assignInputFiles(
  input: HTMLInputElement,
  files: File[],
  multiple: boolean,
) {
  const dt = new DataTransfer();
  const list = multiple ? files : files.slice(0, 1);
  for (const file of list) dt.items.add(file);
  input.files = dt.files;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

type Props = {
  /** Prefill seller name on Used Parts create. */
  defaultSellerName?: string;
  listing?: Listing & {
    images: ListingImage[];
    vin?: string | null;
    storageLocation?: string | null;
    damagesEn?: string | null;
  };
  /** Prefill category on create (e.g. Used Parts page → + List). */
  defaultCategory?: ListingCategory;
  /** When set (e.g. modal), shows a cancel control that runs this. */
  onCancel?: () => void;
};

const categories = (
  Object.entries(ADMIN_CATEGORY_LABELS) as [ListingCategory, string][]
)
  .filter(([value]) => value !== "USED_PARTS")
  .map(([value, label]) => ({ value, label }));

const textFieldsBeforeTransmission = [
  { name: "engineMark", label: "엔진 형식" },
] as const;


function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatOdometer(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

const TRANSMISSION_TYPES = [
  "Automatic",
  "Manual",
  "CVT",
  "DCT",
  "Semi-automatic",
  "Other",
] as const;

const TRANSMISSION_LEGACY: Record<string, (typeof TRANSMISSION_TYPES)[number]> =
  {
    자동: "Automatic",
    수동: "Manual",
    세미오토: "Semi-automatic",
    기타: "Other",
  };

function resolveTransmission(value?: string | null) {
  if (!value) return "";
  if ((TRANSMISSION_TYPES as readonly string[]).includes(value)) return value;
  return TRANSMISSION_LEGACY[value] ?? "";
}

const FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "LPG",
  "Electric",
  "Hybrid(Electric+Gasoline)",
  "Hybrid(Electric+Diesel)",
  "Hydrogen",
  "Other",
] as const;

const FUEL_LEGACY: Record<string, (typeof FUEL_TYPES)[number]> = {
  가솔린: "Gasoline",
  디젤: "Diesel",
  전기: "Electric",
  수소: "Hydrogen",
  기타: "Other",
};

function resolveFuelType(value?: string | null) {
  if (!value) return "";
  if ((FUEL_TYPES as readonly string[]).includes(value)) return value;
  return FUEL_LEGACY[value] ?? "";
}

const selectClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white";

export function ListingForm({
  listing,
  defaultCategory,
  defaultSellerName,
  onCancel,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  /** Used Parts: single-slot multi upload (first = cover, rest = gallery). */
  const [partsFiles, setPartsFiles] = useState<File[]>([]);
  const [partsPreviews, setPartsPreviews] = useState<string[]>([]);
  const [partsDragIndex, setPartsDragIndex] = useState<number | null>(null);
  const [keptCover, setKeptCover] = useState<ListingImage | null>(
    () => listing?.images?.[0] ?? null,
  );
  const [keptGallery, setKeptGallery] = useState<ListingImage[]>(
    () => listing?.images?.slice(1) ?? [],
  );
  const [vehicleGroups, setVehicleGroups] = useState(() =>
    vehicleGroupsFromListing(listing?.images),
  );
  const [displayedImageGroup, setDisplayedImageGroup] =
    useState<ListingImageGroup>(() => {
      if (listing) {
        return parseListingImageGroup(
          (listing as { displayedImageGroup?: number }).displayedImageGroup,
        );
      }
      const start = defaultCategory ?? "CAR_LISTINGS";
      if (start === "STAND_BY") return 1;
      if (start === "CAR_LISTINGS") return 2;
      return 1;
    });
  const [category, setCategory] = useState<ListingCategory>(
    () => listing?.category ?? defaultCategory ?? "CAR_LISTINGS",
  );
  const [linkedMenus, setLinkedMenus] = useState<LinkableMenu[]>(() =>
    parseLinkedMenus(
      (listing as { linkedMenus?: string | null } | undefined)?.linkedMenus,
    ),
  );
  const partsMode = isPartsCategory(category);
  const [auctionEndsAt, setAuctionEndsAt] = useState(() =>
    defaultAuctionEndsLocal(
      (listing as { auctionEndsAt?: Date | string | null } | undefined)
        ?.auctionEndsAt,
    ),
  );
  const [auctionPresetId, setAuctionPresetId] = useState<string | null>(() =>
    listing?.category === "LIVE_AUCTION" &&
    (listing as { auctionEndsAt?: Date | string | null }).auctionEndsAt
      ? null
      : nextAuctionPreset().id,
  );
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef1 = useRef<HTMLInputElement>(null);
  const galleryInputRef1 = useRef<HTMLInputElement>(null);
  const coverInputRef2 = useRef<HTMLInputElement>(null);
  const galleryInputRef2 = useRef<HTMLInputElement>(null);
  const vehicleCoverRefs = { 1: coverInputRef1, 2: coverInputRef2 };
  const vehicleGalleryRefs = { 1: galleryInputRef1, 2: galleryInputRef2 };

  function patchVehicleGroup(
    group: ListingImageGroup,
    patch: (current: VehicleGroupUi) => VehicleGroupUi,
  ) {
    setVehicleGroups((prev) => ({
      ...prev,
      [group]: patch(prev[group]),
    }));
  }

  function applyAuctionPreset(preset: AuctionPreset) {
    setAuctionEndsAt(toKoreaDatetimeLocalValue(resolveAuctionPreset(preset)));
    setAuctionPresetId(preset.id);
  }

  function onCategoryChange(next: ListingCategory) {
    setCategory(next);
    setLinkedMenus((prev) =>
      prev.filter((menu) => !menuCoveredByCategory(next, menu)),
    );
    if (next === "STAND_BY") setDisplayedImageGroup(1);
    if (next === "CAR_LISTINGS") setDisplayedImageGroup(2);
    if (
      next === "LIVE_AUCTION" &&
      !(listing as { auctionEndsAt?: Date | string | null } | undefined)
        ?.auctionEndsAt
    ) {
      applyAuctionPreset(nextAuctionPreset());
    }
  }

  function onDisplayedImageGroupChange(next: ListingImageGroup) {
    setDisplayedImageGroup(next);
    if (listingMovesWithImageGroup(category)) {
      const nextCategory = listingImageGroupCategory(next);
      setCategory(nextCategory);
      setLinkedMenus((prev) =>
        prev.filter((menu) => !menuCoveredByCategory(nextCategory, menu)),
      );
    }
  }

  const applyVehicleCoverFile = useCallback(
    (group: ListingImageGroup, file: File | null) => {
      patchVehicleGroup(group, (current) => {
        if (current.coverPreview) URL.revokeObjectURL(current.coverPreview);
        return {
          ...current,
          coverName: file?.name ?? null,
          coverPreview: file ? URL.createObjectURL(file) : null,
        };
      });
    },
    [],
  );

  const applyVehicleGalleryFiles = useCallback(
    (group: ListingImageGroup, files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      patchVehicleGroup(group, (current) => {
        const remaining =
          MAX_DETAIL_IMAGES_PER_GROUP - current.keptGallery.length;
        if (list.length > remaining) {
          setError(
            `${listingImageGroupLabel(group)} 상세 사진은 최대 ${remaining}장까지 선택할 수 있습니다.`,
          );
          const input = vehicleGalleryRefs[group].current;
          if (input) input.value = "";
          return { ...current, photoCount: 0 };
        }
        setError(null);
        const input = vehicleGalleryRefs[group].current;
        if (input) assignInputFiles(input, list, true);
        return { ...current, photoCount: list.length };
      });
    },
    [],
  );

  const applyPartsFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      if (list.length === 0) {
        setError("Only image files can be uploaded.");
        return;
      }
      const keptCount =
        (keptCover ? 1 : 0) + keptGallery.length;
      // New selection replaces cover when present; kept photos remain unless cleared.
      const total = list.length + keptCount;
      if (total > MAX_IMAGES_PER_USED_PARTS) {
        setError(
          keptCount > 0
            ? `Up to ${MAX_IMAGES_PER_USED_PARTS} photos (${keptCount} kept + ${list.length} new).`
            : `You can upload up to ${MAX_IMAGES_PER_USED_PARTS} photos.`,
        );
        return;
      }
      setError(null);
      setPartsPreviews((prev) => {
        for (const url of prev) URL.revokeObjectURL(url);
        return list.map((file) => URL.createObjectURL(file));
      });
      setPartsFiles(list);
    },
    [keptCover, keptGallery.length],
  );

  const reorderPartsPhotos = useCallback((from: number, to: number) => {
    setPartsFiles((prev) => moveItem(prev, from, to));
    setPartsPreviews((prev) => moveItem(prev, from, to));
  }, []);

  const setPartsCoverAt = useCallback(
    (index: number) => {
      if (index <= 0) return;
      reorderPartsPhotos(index, 0);
    },
    [reorderPartsPhotos],
  );

  const reorderKeptParts = useCallback(
    (from: number, to: number) => {
      const all = [...(keptCover ? [keptCover] : []), ...keptGallery];
      const next = moveItem(all, from, to);
      setKeptCover(next[0] ?? null);
      setKeptGallery(next.slice(1));
    },
    [keptCover, keptGallery],
  );

  const setKeptPartsCoverAt = useCallback(
    (index: number) => {
      if (index <= 0) return;
      reorderKeptParts(index, 0);
    },
    [reorderKeptParts],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setProgress(null);
    setPending(true);

    const form = e.currentTarget;
    if (!form.reportValidity()) {
      setPending(false);
      return;
    }

    const data = new FormData(form);
    data.set("category", category);

    if (partsMode) {
      data.set("year", "0");
      data.set("transmission", "Other");
      data.set("fuelType", "Other");
      const sellerName = String(data.get("model") ?? "").trim();
      if (!sellerName || sellerName === "-") {
        setError("Please enter the seller name.");
        setPending(false);
        return;
      }
      data.set("model", sellerName);
      if (!String(data.get("make") ?? "").trim()) {
        setError("Please enter the part name or title.");
        setPending(false);
        return;
      }
      const contactDigits = String(data.get("whatsappNumber") ?? "").replace(
        /\D/g,
        "",
      );
      if (contactDigits.length < 8) {
        setError(
          "Please enter a phone / WhatsApp number (at least 8 digits).",
        );
        setPending(false);
        return;
      }
    } else {
      const yearNum = parseListingYearInput(data.get("year"));
      if (!yearNum || yearNum < 1980 || yearNum > 2100) {
        setError("연식은 4자리 연도(예: 2000)로 입력해 주세요.");
        setPending(false);
        return;
      }
      data.set("year", String(yearNum));
      const rawRegistration = String(data.get("registrationDate") ?? "").trim();
      if (rawRegistration) {
        const registrationDate = parseRegistrationDateInput(rawRegistration);
        if (!registrationDate) {
          setError(
            "최초 등록일은 연.월.일 형식(예: 2000.01.01)으로 입력해 주세요.",
          );
          setPending(false);
          return;
        }
        data.set("registrationDate", registrationDate);
      }
    }

    if (!partsMode && !listing) {
      const inboundDigits = String(data.get("inboundDate") ?? "").replace(
        /\D/g,
        "",
      );
      if (inboundDigits.length !== 8) {
        setError("낙찰일자를 8자리 숫자(예: 20260719)로 입력해 주세요.");
        setPending(false);
        return;
      }
    }

    if (isStockVehicleCategory(category)) {
      const auctionDigits = String(data.get("auctionPrice") ?? "").replace(
        /\D/g,
        "",
      );
      if (!auctionDigits || Number(auctionDigits) <= 0) {
        setError("낙찰가를 입력해 주세요.");
        setPending(false);
        return;
      }
    }

    if (category === "LIVE_AUCTION") {
      const rawEnds = String(data.get("auctionEndsAt") ?? "").trim();
      const parsedEnds = parseAuctionEndsAtInput(rawEnds);
      if (!parsedEnds) {
        setError("Live Auction 마감 시간을 설정해 주세요.");
        setPending(false);
        return;
      }
      // Send absolute ISO so the server never misreads datetime-local as UTC.
      data.set("auctionEndsAt", parsedEnds.toISOString());
    }

    data.delete("coverImage");
    data.delete("images");

    let coverFile: File | null = null;
    let galleryFiles: File[] = [];
    const vehicleUploads: Record<
      ListingImageGroup,
      { cover: File | null; gallery: File[] }
    > = {
      1: { cover: null, gallery: [] },
      2: { cover: null, gallery: [] },
    };

    if (partsMode) {
      if (partsFiles.length > 0) {
        coverFile = partsFiles[0] ?? null;
        galleryFiles = partsFiles.slice(1);
        if (coverFile) data.set("coverImage", coverFile);
      }
      const keptPartsCount = (keptCover ? 1 : 0) + keptGallery.length;
      const partsTotal =
        (coverFile ? 1 : 0) + galleryFiles.length + keptPartsCount;
      if (partsTotal > MAX_IMAGES_PER_USED_PARTS) {
        setError(
          `You can upload up to ${MAX_IMAGES_PER_USED_PARTS} photos.`,
        );
        setPending(false);
        return;
      }
      if (!listing && !coverFile) {
        setError("Please add at least one photo.");
        setPending(false);
        return;
      }
      if (
        listing &&
        !coverFile &&
        !keptCover &&
        keptGallery.length === 0 &&
        galleryFiles.length === 0
      ) {
        setError("Please keep at least one photo.");
        setPending(false);
        return;
      }
    } else {
      data.set("imageLayout", "groups");
      data.set("displayedImageGroup", String(displayedImageGroup));
      for (const group of LISTING_IMAGE_GROUPS) {
        const coverEntry = data.get(`coverImage${group}`);
        const cover =
          coverEntry instanceof File && coverEntry.size > 0 ? coverEntry : null;
        if (!cover) data.delete(`coverImage${group}`);
        const gallery = data
          .getAll(`images${group}`)
          .filter((f): f is File => f instanceof File && f.size > 0);
        data.delete(`images${group}`);
        vehicleUploads[group] = { cover, gallery };
        const kept = vehicleGroups[group];
        const detailTotal =
          gallery.length + kept.keptGallery.length;
        if (detailTotal > MAX_DETAIL_IMAGES_PER_GROUP) {
          setError(
            `${listingImageGroupLabel(group)} 상세 사진은 최대 ${MAX_DETAIL_IMAGES_PER_GROUP}장입니다.`,
          );
          setPending(false);
          return;
        }
      }
      const group1 = vehicleGroups[1];
      const hasGroup1 =
        Boolean(vehicleUploads[1].cover) ||
        Boolean(group1.keptCover) ||
        group1.keptGallery.length > 0 ||
        vehicleUploads[1].gallery.length > 0;
      if (!hasGroup1) {
        setError(
          listing
            ? "1그룹 사진은 최소 1장 이상 남겨 주세요."
            : "1그룹 대표 사진을 등록해 주세요.",
        );
        setPending(false);
        return;
      }
    }

    try {
      const toCompress = partsMode
        ? [...(coverFile ? [coverFile] : []), ...galleryFiles]
        : LISTING_IMAGE_GROUPS.flatMap((group) => [
            ...(vehicleUploads[group].cover
              ? [vehicleUploads[group].cover!]
              : []),
            ...vehicleUploads[group].gallery,
          ]);
      if (toCompress.length > 0) {
        const optimizing = partsMode
          ? (done: number, total: number) =>
              `Optimizing photos… ${done}/${total}`
          : (done: number, total: number) =>
              `사진 최적화 중… ${done}/${total}`;
        setProgress(optimizing(0, toCompress.length));
        const compressed = await compressImagesForUpload(
          toCompress,
          (done, total) => setProgress(optimizing(done, total)),
        );
        let idx = 0;
        if (partsMode) {
          if (coverFile) {
            coverFile = compressed[idx++] ?? coverFile;
            data.delete("coverImage");
            data.set("coverImage", coverFile);
          }
          galleryFiles = compressed.slice(idx);
        } else {
          for (const group of LISTING_IMAGE_GROUPS) {
            if (vehicleUploads[group].cover) {
              vehicleUploads[group].cover =
                compressed[idx++] ?? vehicleUploads[group].cover;
              data.set(`coverImage${group}`, vehicleUploads[group].cover!);
            }
            vehicleUploads[group].gallery = compressed.slice(
              idx,
              idx + vehicleUploads[group].gallery.length,
            );
            idx += vehicleUploads[group].gallery.length;
          }
        }
      }

      if (partsMode) {
        for (const file of galleryFiles) {
          data.append("images", file);
        }
      } else {
        for (const group of LISTING_IMAGE_GROUPS) {
          for (const file of vehicleUploads[group].gallery) {
            data.append(`images${group}`, file);
          }
        }
      }

      const uploadCount = partsMode
        ? galleryFiles.length + (coverFile ? 1 : 0)
        : LISTING_IMAGE_GROUPS.reduce(
            (sum, group) =>
              sum +
              (vehicleUploads[group].cover ? 1 : 0) +
              vehicleUploads[group].gallery.length,
            0,
          );
      setProgress(
        partsMode
          ? uploadCount > 20
            ? "Saving… Large uploads may take a moment."
            : "Saving…"
          : uploadCount > 20
            ? "서버에 저장 중… 사진이 많아 시간이 걸릴 수 있습니다."
            : "서버에 저장 중…",
      );

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 300_000);
      const res = await fetch(
        listing ? `/api/listings/${listing.id}` : "/api/listings",
        {
          method: listing ? "PUT" : "POST",
          body: data,
          credentials: "include",
          signal: controller.signal,
        },
      );
      window.clearTimeout(timeout);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setError(
          json.error ??
            (partsMode
              ? "Could not save the listing."
              : "매물 저장에 실패했습니다."),
        );
        return;
      }
      if (!json.id) {
        setError(
          partsMode
            ? "Could not save the listing."
            : "매물 저장에 실패했습니다.",
        );
        return;
      }
      const nextUrl = `/listings/${json.id}`;
      if (window.opener) {
        window.location.assign(nextUrl);
      } else {
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      setError(
        partsMode
          ? aborted
            ? "Save timed out. Try fewer photos or try again."
            : "A network error occurred."
          : aborted
            ? "저장 시간이 초과되었습니다. 새 사진 수를 줄이거나 다시 시도해 주세요."
            : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      encType="multipart/form-data"
      lang={partsMode ? "en" : "ko"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {partsMode ? (
          <>
            <input type="hidden" name="category" value="USED_PARTS" />
            <div className="sm:col-span-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-emerald-950">
              Enter seller name, contact (required), part name (or title),
              photos, and description to list.
            </div>
            <Field
              label="Seller name"
              name="model"
              required
              defaultValue={
                listing?.model && listing.model !== "-"
                  ? listing.model
                  : defaultSellerName
              }
              placeholder="e.g. John Kim"
            />
            <Field
              label="Contact (Phone / WhatsApp)"
              name="whatsappNumber"
              type="tel"
              required
              defaultValue={listing?.whatsappNumber ?? undefined}
              placeholder="e.g. 010-1234-5678"
            />
            <Field
              label="Part name or title"
              name="make"
              required
              className="sm:col-span-2"
              defaultValue={listing?.make}
              placeholder="e.g. 2012 QM6 2.0 Front bumper"
            />
            <NumericField
              label="Sale price (optional)"
              name="salePrice"
              defaultValue={listing?.salePrice ?? undefined}
              placeholder="e.g. 850,000"
            />
            <NotesField
              defaultValue={listing?.damages ?? undefined}
              translatedEn={listing?.damagesEn ?? undefined}
              label="Condition · Description"
              placeholder="Condition, included parts, notes, etc."
              hint="Press Enter for a new line. Text is translated to English for the site when saved."
            />
          </>
        ) : (
          <>
        <label className="block text-sm sm:col-span-2 sm:max-w-xs">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            카테고리
          </span>
          <select
            name="category"
            required
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as ListingCategory)
            }
            className={selectClass}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            </select>
          </label>
          <ListingMenuLinkFields
            category={category}
            value={linkedMenus}
            onChange={setLinkedMenus}
          />
          <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            연식
          </span>
          <input
            name="year"
            type="number"
            inputMode="numeric"
            required
            min={1980}
            max={2100}
            step={1}
            placeholder="예: 2000"
            defaultValue={
              listing?.year && listing.year >= 1980
                ? listing.year.toString()
                : undefined
            }
            className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
          />
        </label>
        <Field
          label="최초 등록일"
          name="registrationDate"
          placeholder="예: 2000.01.01"
          defaultValue={
            formatRegistrationDate(listing?.registrationDate) || undefined
          }
        />
        {category === "LIVE_AUCTION" ? (
          <div className="sm:col-span-2 rounded-md border border-rose-200 bg-rose-50/40 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[13px] font-medium tracking-wide text-neutral-700">
                경매 마감 시간
              </p>
              {auctionEndsAt ? (
                <p className="text-[12.5px] font-medium tracking-wide text-rose-800">
                  {formatAuctionEndsSummary(auctionEndsAt)}
                </p>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11.5px] tracking-wide text-neutral-500">
              한국 시간(KST) · 이미 지난 오늘은 선택할 수 없습니다 · 마감 후 회원에게 숨김
            </p>

            <div className="mt-2.5 space-y-2">
              {(
                [
                  ["오늘", AUCTION_TODAY_PRESETS],
                  ["내일", AUCTION_TOMORROW_PRESETS],
                ] as const
              ).map(([dayLabel, presets]) => (
                <div key={dayLabel} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-[12px] font-semibold tracking-wide text-neutral-500">
                    {dayLabel}
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
                    {presets.map((preset) => {
                      const active = auctionPresetId === preset.id;
                      const past = isAuctionPresetPast(preset);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={past}
                          title={past ? "이미 지난 시간입니다" : `${dayLabel} ${preset.timeLabel}`}
                          onClick={() => applyAuctionPreset(preset)}
                          className={`h-9 rounded border text-[12.5px] font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? "border-rose-700 bg-rose-700 text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-rose-300"
                          }`}
                        >
                          {preset.timeLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <label className="block text-sm">
                <span className="mb-1 block text-[12px] font-medium tracking-wide text-neutral-600">
                  직접 선택
                </span>
                <input
                  name="auctionEndsAt"
                  type="datetime-local"
                  required
                  value={auctionEndsAt}
                  onChange={(e) => {
                    setAuctionEndsAt(e.target.value);
                    setAuctionPresetId(null);
                  }}
                  className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] tracking-wide outline-none focus:border-neutral-400 sm:max-w-[14rem]"
                />
              </label>
            </div>
          </div>
        ) : null}
        <Field
          label="제조사"
          name="make"
          required
          defaultValue={listing?.make}
        />
        <Field
          label="모델"
          name="model"
          required
          defaultValue={listing?.model}
        />
        <VinField defaultValue={listing?.vin ?? undefined} />
        {textFieldsBeforeTransmission.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            name={f.name}
            defaultValue={listing?.[f.name] ?? undefined}
          />
        ))}
        <DisplacementField
          defaultValue={listing?.displacement ?? undefined}
        />
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            변속기
          </span>
          <select
            name="transmission"
            required
            defaultValue={resolveTransmission(listing?.transmission)}
            className={selectClass}
          >
            <option value="" disabled>
              선택
            </option>
            {TRANSMISSION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <OdometerField defaultValue={listing?.odometer ?? undefined} />
        <NumericField
          label="판매가 (선택)"
          name="salePrice"
          defaultValue={listing?.salePrice ?? undefined}
          placeholder="예: 8,500,000"
        />
        <NotesField
          defaultValue={listing?.damages ?? undefined}
          translatedEn={listing?.damagesEn ?? undefined}
        />
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            연료
          </span>
          <select
            name="fuelType"
            required
            defaultValue={resolveFuelType(listing?.fuelType)}
            className={selectClass}
          >
            <option value="" disabled>
              선택
            </option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="유튜브 URL"
          name="youtubeUrl"
          defaultValue={listing?.youtubeUrl ?? undefined}
        />
        <Field
          label="WhatsApp 번호"
          name="whatsappNumber"
          defaultValue={listing?.whatsappNumber || DEFAULT_LISTING_WHATSAPP}
          placeholder={DEFAULT_LISTING_WHATSAPP}
        />
          </>
        )}
      </div>

      {!partsMode ? (
        <div className="rounded-md border border-[var(--line)] bg-neutral-50/40 px-4 py-4">
          <div className="mb-3">
            <p className="text-[13px] font-medium tracking-wide text-neutral-700">
              내부 참고 정보
            </p>
            <p className="mt-1 text-[12px] leading-relaxed tracking-wide text-neutral-400">
              외부에 공개되지 않으며, 관리자만 확인할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="차량번호"
              name="vehicleNumber"
              defaultValue={listing?.vehicleNumber ?? undefined}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
                보관장소
              </span>
              <select
                name="storageLocation"
                defaultValue={
                  canonicalizeStorageLocation(listing?.storageLocation) ?? ""
                }
                className={selectClass}
              >
                <option value="">선택</option>
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
                {(() => {
                  const current = canonicalizeStorageLocation(
                    listing?.storageLocation,
                  );
                  if (
                    !current ||
                    (STORAGE_LOCATIONS as readonly string[]).includes(current)
                  ) {
                    return null;
                  }
                  return (
                    <option key={current} value={current}>
                      {current}
                    </option>
                  );
                })()}
              </select>
            </label>
            <InboundDateFields
              inboundDate={listing?.inboundDate ?? undefined}
              required={!listing}
              defaultToToday={!listing}
            />
            <InternalCostFields
              auctionPrice={listing?.auctionPrice ?? undefined}
              incidentalCost={listing?.incidentalCost ?? undefined}
              auctionPriceRequired={
                isStockVehicleCategory(category)
              }
            />
          </div>
        </div>
      ) : null}

      {listing ? <input type="hidden" name="manageImages" value="1" /> : null}
      {partsMode ? (
        <>
          {keptCover ? (
            <input type="hidden" name="keepImageIds" value={keptCover.id} />
          ) : null}
          {keptGallery.map((img) => (
            <input
              key={img.id}
              type="hidden"
              name="keepImageIds"
              value={img.id}
            />
          ))}
        </>
      ) : (
        <>
          <input type="hidden" name="imageLayout" value="groups" />
          <input
            type="hidden"
            name="displayedImageGroup"
            value={displayedImageGroup}
          />
          {LISTING_IMAGE_GROUPS.map((group) => (
            <span key={group}>
              {vehicleGroups[group].keptCover ? (
                <input
                  type="hidden"
                  name={`keepCoverId${group}`}
                  value={vehicleGroups[group].keptCover!.id}
                />
              ) : null}
              {vehicleGroups[group].keptGallery.map((img) => (
                <input
                  key={img.id}
                  type="hidden"
                  name={`keepImageIds${group}`}
                  value={img.id}
                />
              ))}
            </span>
          ))}
        </>
      )}

      {partsMode ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="block text-[13px] font-medium tracking-wide text-neutral-600">
              Photos
              <span className="font-normal text-neutral-400">
                {" "}
                · Select multiple · Drag or use Set as cover to reorder · Max{" "}
                {MAX_IMAGES_PER_USED_PARTS}
              </span>
            </span>
            {listing &&
            (keptCover || keptGallery.length > 0 || partsFiles.length > 0) ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      "Delete all selected and kept photos?",
                    )
                  ) {
                    return;
                  }
                  setKeptCover(null);
                  setKeptGallery([]);
                  setPartsFiles([]);
                  setPartsPreviews((prev) => {
                    for (const url of prev) URL.revokeObjectURL(url);
                    return [];
                  });
                  setError(null);
                }}
                className="inline-flex h-7 shrink-0 items-center rounded-md border border-red-200 bg-white px-2.5 text-[12px] font-medium tracking-wide text-red-700 transition hover:bg-red-50"
              >
                Delete all photos
              </button>
            ) : null}
          </div>

          <ImageDropZone
            inputRef={galleryInputRef}
            name="partsImages"
            accept={IMAGE_ACCEPT}
            multiple
            browseLabel="Select photos"
            chooseFileLabel="Choose files"
            dropLabel="Drop photos here"
            hint={
              partsFiles.length > 0
                ? `${partsFiles.length} selected · Cover can be changed · Select again to replace`
                : "Drag and drop or browse · JPG/PNG/WEBP/GIF · Multiple"
            }
            onFiles={(files) => applyPartsFiles(files)}
            onInputChange={(e) => {
              applyPartsFiles(e.target.files ?? []);
            }}
          />

          {partsPreviews.length > 0 ? (
            <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {partsPreviews.map((url, index) => (
                <div
                  key={url}
                  data-allow-image-drag
                  draggable
                  onDragStart={(e) => {
                    if ((e.target as HTMLElement).closest("button")) {
                      e.preventDefault();
                      return;
                    }
                    setPartsDragIndex(index);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (partsDragIndex == null) return;
                    reorderPartsPhotos(partsDragIndex, index);
                    setPartsDragIndex(null);
                  }}
                  onDragEnd={() => setPartsDragIndex(null)}
                  className={`relative aspect-square cursor-grab active:cursor-grabbing ${
                    partsDragIndex === index ? "opacity-60" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="pointer-events-none h-full w-full rounded-sm border border-neutral-200 object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute left-0.5 top-0.5 rounded bg-neutral-900/80 px-1 py-0.5 text-[9px] font-semibold text-white">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setPartsCoverAt(index)}
                      className="absolute left-0.5 top-0.5 rounded bg-white/90 px-1 py-0.5 text-[9px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 hover:bg-white"
                    >
                      Set as cover
                    </button>
                  )}
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setPartsFiles((prev) => prev.filter((_, i) => i !== index));
                      setPartsPreviews((prev) => {
                        const removed = prev[index];
                        if (removed) URL.revokeObjectURL(removed);
                        return prev.filter((_, i) => i !== index);
                      });
                    }}
                    className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[12px] leading-none text-white hover:bg-black/90"
                    aria-label="Remove photo"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {listing && (keptCover || keptGallery.length > 0) ? (
            <div className="mt-2">
              <p className="mb-1.5 text-[12px] tracking-wide text-neutral-500">
                Kept photos
                {partsFiles.length > 0
                  ? " · New uploads become the cover first"
                  : " · Drag or use Set as cover to reorder"}
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
                {[
                  ...(keptCover ? [keptCover] : []),
                  ...keptGallery,
                ].map((img, index) => (
                  <div
                    key={img.id}
                    data-allow-image-drag
                    draggable={partsFiles.length === 0}
                    onDragStart={() => {
                      if (partsFiles.length === 0) setPartsDragIndex(index);
                    }}
                    onDragOver={(e) => {
                      if (partsFiles.length === 0) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (partsFiles.length > 0 || partsDragIndex == null) return;
                      reorderKeptParts(partsDragIndex, index);
                      setPartsDragIndex(null);
                    }}
                    onDragEnd={() => setPartsDragIndex(null)}
                    className={`relative aspect-square ${
                      partsFiles.length === 0
                        ? "cursor-grab active:cursor-grabbing"
                        : ""
                    } ${partsDragIndex === index ? "opacity-60" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      draggable={false}
                      className="pointer-events-none h-full w-full rounded-sm border border-neutral-200 object-cover"
                    />
                    {index === 0 && !partsFiles.length ? (
                      <span className="absolute left-0.5 top-0.5 rounded bg-neutral-900/80 px-1 py-0.5 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    ) : null}
                    {index > 0 && partsFiles.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setKeptPartsCoverAt(index)}
                        className="absolute left-0.5 top-0.5 rounded bg-white/90 px-1 py-0.5 text-[9px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 hover:bg-white"
                      >
                        Set as cover
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (keptCover?.id === img.id) {
                          const [next, ...rest] = keptGallery;
                          setKeptCover(next ?? null);
                          setKeptGallery(rest);
                        } else {
                          setKeptGallery((prev) =>
                            prev.filter((item) => item.id !== img.id),
                          );
                        }
                      }}
                      className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[12px] leading-none text-white hover:bg-black/90"
                      aria-label="Remove photo"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
      <div className="space-y-4 text-sm">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            사이트 노출 그룹
            <span className="font-normal text-neutral-400">
              {" "}
              · 아이콘을 눌러 목록·상세에 보여줄 세트를 선택합니다
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <ListingImageGroupToggle
              value={displayedImageGroup}
              showEmpty
              disabled={{
                2: (() => {
                  const groupState = vehicleGroups[2];
                  const ready =
                    Boolean(groupState.keptCover) ||
                    Boolean(groupState.coverPreview) ||
                    groupState.keptGallery.length > 0 ||
                    groupState.photoCount > 0;
                  return !ready && displayedImageGroup !== 2;
                })(),
              }}
              onChange={onDisplayedImageGroupChange}
            />
            <span className="text-[12px] tracking-wide text-neutral-500">
              {listingImageGroupLabel(displayedImageGroup)}
              {listingMovesWithImageGroup(category)
                ? displayedImageGroup === 2
                  ? " · Car Listings로 이동"
                  : " · Stand by로 이동"
                : " 대표·상세가 사이트에 표시됩니다"}
            </span>
          </div>
        </div>

        {LISTING_IMAGE_GROUPS.map((group) => {
          const state = vehicleGroups[group];
          const coverInput = vehicleCoverRefs[group];
          const galleryInput = vehicleGalleryRefs[group];
          const showing = displayedImageGroup === group;
          return (
            <div
              key={group}
              className={`space-y-3 rounded-lg border px-3 py-3 ${
                showing
                  ? "border-neutral-800 bg-white"
                  : "border-neutral-200 bg-neutral-50/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold tracking-wide text-neutral-800">
                  {listingImageGroupLabel(group)}
                  {showing ? (
                    <span className="ml-1.5 font-normal text-emerald-700">
                      사이트 노출
                    </span>
                  ) : (
                    <span className="ml-1.5 font-normal text-neutral-400">
                      보관
                    </span>
                  )}
                </p>
                {group === 2 ? (
                  <span className="text-[12px] tracking-wide text-neutral-400">
                    선택 사항
                  </span>
                ) : (
                  <span className="text-[12px] tracking-wide text-neutral-400">
                    대표 사진 필수
                  </span>
                )}
              </div>

              <div>
                <span className="mb-1 block text-[13px] font-medium tracking-wide text-neutral-600">
                  대표 이미지
                  <span className="font-normal text-neutral-400">
                    {" "}
                    · 1장만
                    {listing
                      ? " · 삭제 후 새로 올리거나, 상세 사진이 대표로 승격됩니다"
                      : " · 이 그룹의 목록 카드에 표시"}
                  </span>
                </span>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  {(state.coverPreview || state.keptCover?.url) && (
                    <div className="relative h-[4.5rem] w-full shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 sm:w-[7.5rem]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.coverPreview ?? state.keptCover!.url}
                        alt={`${listingImageGroupLabel(group)} 대표 미리보기`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (coverInput.current) coverInput.current.value = "";
                          if (state.coverPreview) {
                            applyVehicleCoverFile(group, null);
                            return;
                          }
                          patchVehicleGroup(group, (current) => {
                            const [next, ...rest] = current.keptGallery;
                            return {
                              ...current,
                              keptCover: next ?? null,
                              keptGallery: rest,
                            };
                          });
                        }}
                        className="absolute right-1 top-1 inline-flex h-6 items-center rounded bg-black/70 px-1.5 text-[11px] font-medium text-white hover:bg-black/85"
                      >
                        삭제
                      </button>
                    </div>
                  )}

                  <ImageDropZone
                    className="min-w-0 flex-1"
                    inputRef={coverInput}
                    name={`coverImage${group}`}
                    accept={IMAGE_ACCEPT}
                    browseLabel={`${listingImageGroupLabel(group)} 대표 사진 선택`}
                    hint={
                      state.coverName
                        ? state.coverName
                        : "드래그하여 놓거나 선택 · JPG/PNG/WEBP/GIF · 1장만"
                    }
                    onFiles={(files) => {
                      const file = files.find(isImageFile) ?? null;
                      if (!file) {
                        setError("이미지 파일만 등록할 수 있습니다.");
                        return;
                      }
                      setError(null);
                      if (coverInput.current) {
                        assignInputFiles(coverInput.current, [file], false);
                      }
                      applyVehicleCoverFile(group, file);
                    }}
                    onInputChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      applyVehicleCoverFile(group, file);
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                  <span className="block text-[13px] font-medium tracking-wide text-neutral-600">
                    상세 이미지
                    <span className="font-normal text-neutral-400">
                      {" "}
                      · 최대 {MAX_DETAIL_IMAGES_PER_GROUP}장
                      {listing ? " · 개별 × 또는 전체 삭제" : ""}
                    </span>
                  </span>
                  {listing &&
                  (state.keptGallery.length > 0 || state.photoCount > 0) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const parts: string[] = [];
                        if (state.keptGallery.length > 0) {
                          parts.push(
                            `보관 중인 상세 사진 ${state.keptGallery.length}장`,
                          );
                        }
                        if (state.photoCount > 0) {
                          parts.push(`새로 선택한 사진 ${state.photoCount}장`);
                        }
                        if (
                          !confirm(
                            `${group}그룹 ${parts.join("과 ")}을(를) 모두 삭제할까요?`,
                          )
                        ) {
                          return;
                        }
                        patchVehicleGroup(group, (current) => ({
                          ...current,
                          keptGallery: [],
                          photoCount: 0,
                        }));
                        if (galleryInput.current) galleryInput.current.value = "";
                        setError(null);
                      }}
                      className="inline-flex h-7 shrink-0 items-center rounded-md border border-red-200 bg-white px-2.5 text-[12px] font-medium tracking-wide text-red-700 transition hover:bg-red-50"
                    >
                      상세 사진 전체 삭제
                      {state.keptGallery.length + state.photoCount > 0
                        ? ` (${state.keptGallery.length + state.photoCount})`
                        : ""}
                    </button>
                  ) : null}
                </div>

                <ImageDropZone
                  inputRef={galleryInput}
                  name={`images${group}`}
                  accept={IMAGE_ACCEPT}
                  multiple
                  browseLabel={`${listingImageGroupLabel(group)} 상세 사진 선택`}
                  hint={
                    state.photoCount > 0
                      ? `${state.photoCount}장 선택됨 (최대 ${MAX_DETAIL_IMAGES_PER_GROUP}장) · 드래그로 다시 지정 가능`
                      : `드래그하여 놓거나 선택 · JPG/PNG · 최대 ${MAX_DETAIL_IMAGES_PER_GROUP}장`
                  }
                  onFiles={(files) => applyVehicleGalleryFiles(group, files)}
                  onInputChange={(e) => {
                    applyVehicleGalleryFiles(group, e.target.files ?? []);
                  }}
                />

                {state.keptGallery.length > 0 ? (
                  <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
                    {state.keptGallery.map((img) => (
                      <div key={img.id} className="relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt=""
                          className="h-full w-full rounded-sm border border-neutral-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            patchVehicleGroup(group, (current) => ({
                              ...current,
                              keptCover: img,
                              keptGallery: [
                                ...(current.keptCover
                                  ? [current.keptCover]
                                  : []),
                                ...current.keptGallery.filter(
                                  (item) => item.id !== img.id,
                                ),
                              ],
                            }))
                          }
                          className="absolute left-0.5 top-0.5 rounded bg-white/90 px-1 py-0.5 text-[9px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 hover:bg-white"
                        >
                          대표
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchVehicleGroup(group, (current) => ({
                              ...current,
                              keptGallery: current.keptGallery.filter(
                                (item) => item.id !== img.id,
                              ),
                            }))
                          }
                          className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[12px] leading-none text-white hover:bg-black/90"
                          aria-label="사진 삭제"
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {listing && state.keptGallery.length === 0 ? (
                  <p className="mt-1.5 text-[12px] tracking-wide text-neutral-400">
                    보관 중인 상세 사진이 없습니다. 위에서 새로 추가할 수 있습니다.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && !error ? (
        <p className="text-[13px] tracking-wide text-neutral-500">{progress}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-800 px-5 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending
            ? progress?.startsWith("Optimizing") ||
              progress?.startsWith("사진 최적화")
              ? partsMode
                ? "Optimizing…"
                : "최적화 중…"
              : partsMode
                ? "Saving…"
                : "저장 중…"
            : listing
              ? partsMode
                ? "Save changes"
                : "매물 수정"
              : partsMode
                ? "List part"
                : "매물 등록"}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-[13.5px] font-medium tracking-wide text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {partsMode ? "Cancel" : "취소"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function normalizeVin(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function VinField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => normalizeVin(defaultValue ?? ""));

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        차대번호
      </span>
      <input
        name="vin"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="영문 대문자·숫자만"
        value={value}
        onChange={(e) => setValue(normalizeVin(e.target.value))}
        className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide uppercase outline-none focus:border-neutral-400 focus:bg-white"
      />
    </label>
  );
}

function NotesField({
  defaultValue,
  translatedEn,
  label = "특이사항",
  placeholder = "한 줄씩 입력할 수 있습니다.\n예:\n전면 범퍼 스크래치\n휠 기스",
  hint,
}: {
  defaultValue?: string;
  translatedEn?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm sm:col-span-2">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        {label}
      </span>
      <textarea
        name="damages"
        rows={5}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-neutral-200 bg-neutral-50/40 px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap outline-none focus:border-neutral-400 focus:bg-white"
      />
      <span className="mt-1.5 block text-[12px] leading-relaxed tracking-wide text-neutral-400">
        {hint ??
          "Enter로 줄바꿈할 수 있습니다. 저장 시 영문으로 번역되어 사이트에 노출됩니다."}
        {translatedEn ? (
          <>
            {" "}
            {hint ? "Public text: " : "현재 공개 문구: "}
            <span className="whitespace-pre-wrap text-neutral-600">
              {translatedEn}
            </span>
          </>
        ) : null}
      </span>
    </label>
  );
}

function OdometerField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => formatOdometer(defaultValue ?? ""));

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        주행거리
      </span>
      <div className="relative">
        <input
          name="odometer"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 100,000"
          value={value}
          onChange={(e) => setValue(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 py-1 pl-3 pr-11 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] tracking-wide text-neutral-500">
          km
        </span>
      </div>
    </label>
  );
}

function DisplacementField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => formatOdometer(defaultValue ?? ""));

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        배기량
      </span>
      <div className="relative">
        <input
          name="displacement"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 1,998"
          value={value}
          onChange={(e) => setValue(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 py-1 pl-3 pr-11 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] tracking-wide text-neutral-500">
          cc
        </span>
      </div>
    </label>
  );
}

function calcDaysFromInbound(inboundDigits: string): string {
  if (inboundDigits.length !== 8) return "";
  const y = Number(inboundDigits.slice(0, 4));
  const m = Number(inboundDigits.slice(4, 6));
  const d = Number(inboundDigits.slice(6, 8));
  const inbound = new Date(y, m - 1, d);
  if (Number.isNaN(inbound.getTime())) return "";
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = startToday.getTime() - inbound.getTime();
  return String(Math.max(0, Math.floor(diffMs / 86_400_000)));
}

function InboundDateFields({
  inboundDate,
  required = false,
  defaultToToday = false,
}: {
  inboundDate?: string;
  required?: boolean;
  defaultToToday?: boolean;
}) {
  const [inbound, setInbound] = useState(() => {
    const existing = digitsOnly(inboundDate ?? "").slice(0, 8);
    if (existing) return existing;
    return defaultToToday ? koreaTodayYyyymmdd() : "";
  });
  const days = calcDaysFromInbound(inbound);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          낙찰일자
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </span>
        <input
          name="inboundDate"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          minLength={required ? 8 : undefined}
          maxLength={8}
          placeholder="등록일 자동입력 (예: 20260719)"
          value={inbound}
          onChange={(e) => setInbound(digitsOnly(e.target.value).slice(0, 8))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          누적일
          <span className="ml-1.5 font-normal text-neutral-400">
            (낙찰일 ~ 오늘)
          </span>
        </span>
        <input type="hidden" name="accumulatedDays" value={days} />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          tabIndex={-1}
          placeholder="낙찰일자 입력 시 자동 계산"
          value={days === "" ? "" : `${days}일`}
          className="h-10 w-full cursor-default rounded-md border border-neutral-200 bg-neutral-100 px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none"
        />
      </label>
    </>
  );
}

function sumCostDisplay(auction: string, incidental: string) {
  const total =
    (Number(digitsOnly(auction) || "0") || 0) +
    (Number(digitsOnly(incidental) || "0") || 0);
  if (!digitsOnly(auction) && !digitsOnly(incidental)) return "";
  return formatOdometer(String(total));
}

function InternalCostFields({
  auctionPrice,
  incidentalCost,
  auctionPriceRequired = false,
}: {
  auctionPrice?: string;
  incidentalCost?: string;
  auctionPriceRequired?: boolean;
}) {
  const [auction, setAuction] = useState(() =>
    formatOdometer(auctionPrice ?? ""),
  );
  const [incidental, setIncidental] = useState(() =>
    formatOdometer(incidentalCost ?? ""),
  );
  const cost = sumCostDisplay(auction, incidental);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          낙찰가
          {auctionPriceRequired ? (
            <span className="ml-1.5 font-normal text-neutral-400">(필수)</span>
          ) : null}
        </span>
        <input
          name="auctionPrice"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={auctionPriceRequired}
          placeholder="예: 10,000,000"
          value={auction}
          onChange={(e) => setAuction(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          부대비용
        </span>
        <input
          name="incidentalCost"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 500,000"
          value={incidental}
          onChange={(e) => setIncidental(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          원가
          <span className="ml-1.5 font-normal text-neutral-400">
            (낙찰가 + 부대비용)
          </span>
        </span>
        <input
          name="costPrice"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          tabIndex={-1}
          placeholder="자동 계산"
          value={cost}
          className="h-10 w-full cursor-default rounded-md border border-neutral-200 bg-neutral-100 px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none"
        />
      </label>
    </>
  );
}

function NumericField({
  label,
  name,
  defaultValue,
  placeholder,
  maxDigits,
  withCommas = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxDigits?: number;
  withCommas?: boolean;
}) {
  const [value, setValue] = useState(() => {
    const digits = digitsOnly(defaultValue ?? "");
    if (!digits) return "";
    return withCommas ? formatOdometer(digits) : digits;
  });

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        {label}
      </span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          let digits = digitsOnly(e.target.value);
          if (maxDigits != null) digits = digits.slice(0, maxDigits);
          setValue(withCommas ? formatOdometer(digits) : digits);
        }}
        className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
      />
    </label>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm${className ? ` ${className}` : ""}`}>
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
      />
    </label>
  );
}

function ImageDropZone({
  inputRef,
  name,
  accept,
  multiple = false,
  browseLabel,
  hint,
  onFiles,
  onInputChange,
  className = "",
  chooseFileLabel = "파일 선택",
  dropLabel = "여기에 놓아 등록",
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  name: string;
  accept: string;
  multiple?: boolean;
  browseLabel: string;
  hint: string;
  onFiles: (files: File[]) => void;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  chooseFileLabel?: string;
  dropLabel?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(isImageFile);
    if (files.length === 0) return;
    onFiles(files);
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex min-h-[3.25rem] items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5 transition ${
        dragOver
          ? "border-neutral-800 bg-neutral-100"
          : "border-neutral-300 bg-neutral-50/70 hover:border-neutral-400 hover:bg-neutral-50"
      } ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium tracking-wide text-neutral-800">
          {dragOver ? dropLabel : browseLabel}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] tracking-wide text-neutral-500">
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-[12.5px] font-medium tracking-wide text-neutral-800 hover:bg-neutral-50"
      >
        {chooseFileLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={onInputChange}
      />
    </div>
  );
}
