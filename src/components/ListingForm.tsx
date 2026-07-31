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
  parseAuctionEndsAtInput,
  toKoreaDatetimeLocalValue,
} from "@/lib/format-korea-time";
import {
  isPartsCategory,
  MAX_IMAGES_PER_LISTING,
  MAX_IMAGES_PER_USED_PARTS,
} from "@/lib/listings";
import {
  STORAGE_LOCATIONS,
  canonicalizeStorageLocation,
} from "@/lib/storage-location";

const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif";

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

type AuctionPreset =
  | { id: string; label: string; kind: "relative"; minutes: number }
  | {
      id: string;
      label: string;
      kind: "clock";
      dayOffset: number;
      hour: number;
      minute: number;
    };

const AUCTION_QUICK_PRESETS: AuctionPreset[] = [
  { id: "m30", label: "30분", kind: "relative", minutes: 30 },
  { id: "h1", label: "1시간", kind: "relative", minutes: 60 },
  { id: "h3", label: "3시간", kind: "relative", minutes: 180 },
  { id: "h6", label: "6시간", kind: "relative", minutes: 360 },
  { id: "h12", label: "12시간", kind: "relative", minutes: 720 },
  { id: "d1", label: "1일", kind: "relative", minutes: 1440 },
];

const AUCTION_CLOCK_PRESETS: AuctionPreset[] = [
  { id: "today14", label: "오늘 14시", kind: "clock", dayOffset: 0, hour: 14, minute: 0 },
  { id: "today18", label: "오늘 18시", kind: "clock", dayOffset: 0, hour: 18, minute: 0 },
  { id: "tomorrow14", label: "내일 14시", kind: "clock", dayOffset: 1, hour: 14, minute: 0 },
  { id: "tomorrow18", label: "내일 18시", kind: "clock", dayOffset: 1, hour: 18, minute: 0 },
];

function toDatetimeLocalValue(date: Date) {
  return toKoreaDatetimeLocalValue(date);
}

/** Round up to the next 5-minute mark for quicker, cleaner deadlines. */
function roundUpToFiveMinutes(date: Date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const rem = mins % 5;
  if (rem !== 0) d.setMinutes(mins + (5 - rem));
  return d;
}

function resolveAuctionPreset(preset: AuctionPreset): Date {
  if (preset.kind === "relative") {
    return roundUpToFiveMinutes(
      new Date(Date.now() + preset.minutes * 60 * 1000),
    );
  }

  // "오늘/내일 HH:mm" as Asia/Seoul wall clock (independent of server TZ).
  const seoulStamp = toKoreaDatetimeLocalValue(new Date());
  const [datePart] = seoulStamp.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  const wallForOffset = (dayOffset: number) => {
    const day = new Date(Date.UTC(y, mo - 1, d + dayOffset));
    return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${pad(preset.hour)}:${pad(preset.minute)}`;
  };

  let resolved = parseAuctionEndsAtInput(wallForOffset(preset.dayOffset));
  if (!resolved) {
    return roundUpToFiveMinutes(new Date(Date.now() + 60 * 60 * 1000));
  }
  if (resolved.getTime() <= Date.now()) {
    resolved =
      parseAuctionEndsAtInput(wallForOffset(preset.dayOffset + 1)) ?? resolved;
  }
  return resolved;
}

function formatAuctionEndsSummary(localValue: string): string {
  if (!localValue) return "";
  const d = parseAuctionEndsAtInput(localValue);
  if (!d) return "";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultAuctionEndsLocal(existing?: Date | string | null) {
  if (existing) {
    const formatted = toKoreaDatetimeLocalValue(existing);
    if (formatted) return formatted;
  }
  return toDatetimeLocalValue(
    resolveAuctionPreset({
      id: "d1",
      label: "1일",
      kind: "relative",
      minutes: 1440,
    }),
  );
}

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
  const [coverName, setCoverName] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  /** Used Parts: single-slot multi upload (first = cover, rest = gallery). */
  const [partsFiles, setPartsFiles] = useState<File[]>([]);
  const [partsPreviews, setPartsPreviews] = useState<string[]>([]);
  const [keptCover, setKeptCover] = useState<ListingImage | null>(
    () => listing?.images?.[0] ?? null,
  );
  const [keptGallery, setKeptGallery] = useState<ListingImage[]>(
    () => listing?.images?.slice(1) ?? [],
  );
  const [category, setCategory] = useState<ListingCategory>(
    () => listing?.category ?? defaultCategory ?? "CAR_LISTINGS",
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
      : "d1",
  );
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function applyAuctionPreset(preset: AuctionPreset) {
    setAuctionEndsAt(toDatetimeLocalValue(resolveAuctionPreset(preset)));
    setAuctionPresetId(preset.id);
  }

  function onCategoryChange(next: ListingCategory) {
    setCategory(next);
    if (
      next === "LIVE_AUCTION" &&
      !(listing as { auctionEndsAt?: Date | string | null } | undefined)
        ?.auctionEndsAt
    ) {
      applyAuctionPreset({
        id: "d1",
        label: "1일",
        kind: "relative",
        minutes: 1440,
      });
    }
  }

  const applyCoverFile = useCallback(
    (file: File | null) => {
      setCoverName(file?.name ?? null);
      setCoverPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return file ? URL.createObjectURL(file) : null;
      });
      if (file) setKeptCover(null);
    },
    [],
  );

  const applyGalleryFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      const maxGallery = MAX_IMAGES_PER_LISTING - 1;
      if (list.length > maxGallery) {
        setError(
          `추가 사진은 최대 ${maxGallery}장까지 선택할 수 있습니다. (대표 사진 포함 ${MAX_IMAGES_PER_LISTING}장)`,
        );
        if (galleryInputRef.current) galleryInputRef.current.value = "";
        setPhotoCount(0);
        return;
      }
      setError(null);
      setPhotoCount(list.length);
      if (galleryInputRef.current) {
        assignInputFiles(galleryInputRef.current, list, true);
      }
    },
    [],
  );

  const applyPartsFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      if (list.length === 0) {
        setError("이미지 파일만 등록할 수 있습니다.");
        return;
      }
      const keptCount =
        (keptCover ? 1 : 0) + keptGallery.length;
      // New selection replaces cover when present; kept photos remain unless cleared.
      const total = list.length + keptCount;
      if (total > MAX_IMAGES_PER_USED_PARTS) {
        setError(
          keptCount > 0
            ? `사진은 최대 ${MAX_IMAGES_PER_USED_PARTS}장입니다. (보관 ${keptCount}장 + 새 사진 ${list.length}장)`
            : `사진은 최대 ${MAX_IMAGES_PER_USED_PARTS}장까지 등록할 수 있습니다.`,
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
        setError("판매자명을 입력해 주세요.");
        setPending(false);
        return;
      }
      data.set("model", sellerName);
      if (!String(data.get("make") ?? "").trim()) {
        setError("부품명 또는 제목을 입력해 주세요.");
        setPending(false);
        return;
      }
      const contactDigits = String(data.get("whatsappNumber") ?? "").replace(
        /\D/g,
        "",
      );
      if (contactDigits.length < 8) {
        setError("연락처(전화/WhatsApp)를 입력해 주세요. (숫자 8자리 이상)");
        setPending(false);
        return;
      }
    } else {
      const yearDigits = String(data.get("year") ?? "").replace(/\D/g, "");
      const yearNum =
        yearDigits.length >= 4 ? Number(yearDigits.slice(0, 4)) : NaN;
      if (!Number.isFinite(yearNum) || yearNum < 1980 || yearNum > 2100) {
        setError("연식은 4자리 연도(예: 2024)로 입력해 주세요.");
        setPending(false);
        return;
      }
      data.set("year", String(yearNum));
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

    // Drop empty file fields so the API does not treat them as uploads
    const coverEntry = data.get("coverImage");
    if (coverEntry instanceof File && coverEntry.size === 0) {
      data.delete("coverImage");
    }
    let galleryFiles = data
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    data.delete("images");

    let coverFile =
      coverEntry instanceof File && coverEntry.size > 0 ? coverEntry : null;

    if (partsMode) {
      data.delete("coverImage");
      data.delete("images");
      if (partsFiles.length > 0) {
        coverFile = partsFiles[0] ?? null;
        galleryFiles = partsFiles.slice(1);
        if (coverFile) data.set("coverImage", coverFile);
      } else {
        coverFile = null;
        galleryFiles = [];
      }
      const keptPartsCount =
        (keptCover ? 1 : 0) + keptGallery.length;
      const partsTotal =
        (coverFile ? 1 : 0) + galleryFiles.length + keptPartsCount;
      if (partsTotal > MAX_IMAGES_PER_USED_PARTS) {
        setError(
          `사진은 최대 ${MAX_IMAGES_PER_USED_PARTS}장까지 등록할 수 있습니다.`,
        );
        setPending(false);
        return;
      }
    }

    if (!listing) {
      if (!coverFile) {
        setError(
          partsMode
            ? "사진을 1장 이상 등록해 주세요."
            : "대표(메인) 사진을 등록해 주세요.",
        );
        setPending(false);
        return;
      }
    } else {
      const hasNewCover = Boolean(coverFile);
      const hasNewGallery = galleryFiles.length > 0;
      if (
        !hasNewCover &&
        !keptCover &&
        keptGallery.length === 0 &&
        !hasNewGallery
      ) {
        setError("사진은 최소 1장 이상 남겨 주세요.");
        setPending(false);
        return;
      }
    }

    try {
      const toCompress = [
        ...(coverFile ? [coverFile] : []),
        ...galleryFiles,
      ];
      if (toCompress.length > 0) {
        setProgress(`사진 최적화 중… 0/${toCompress.length}`);
        const compressed = await compressImagesForUpload(
          toCompress,
          (done, total) => setProgress(`사진 최적화 중… ${done}/${total}`),
        );
        let idx = 0;
        if (coverFile) {
          coverFile = compressed[idx++] ?? coverFile;
          data.delete("coverImage");
          data.set("coverImage", coverFile);
        }
        galleryFiles = compressed.slice(idx);
      }

      for (const file of galleryFiles) {
        data.append("images", file);
      }

      setProgress(
        galleryFiles.length + (coverFile ? 1 : 0) > 20
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
          signal: controller.signal,
        },
      );
      window.clearTimeout(timeout);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "매물 저장에 실패했습니다.");
        return;
      }
      if (!json.id) {
        setError("매물 저장에 실패했습니다.");
        return;
      }
      router.push(`/listings/${json.id}`);
      router.refresh();
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
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
      lang="ko"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {partsMode ? (
          <>
            <input type="hidden" name="category" value="USED_PARTS" />
            <div className="sm:col-span-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-emerald-950">
              판매자명·연락처(필수)·부품명(또는 제목)·사진·설명을 입력하면
              등록됩니다.
            </div>
            <Field
              label="판매자명"
              name="model"
              required
              defaultValue={
                listing?.model && listing.model !== "-"
                  ? listing.model
                  : defaultSellerName
              }
              placeholder="예: 홍길동"
            />
            <Field
              label="연락처 (전화 / WhatsApp)"
              name="whatsappNumber"
              type="tel"
              required
              defaultValue={listing?.whatsappNumber ?? undefined}
              placeholder="예: 010-1234-5678"
            />
            <Field
              label="부품명 또는 제목"
              name="make"
              required
              className="sm:col-span-2"
              defaultValue={listing?.make}
              placeholder="예: 2012 QM6 2.0 Front bumper"
            />
            <NotesField
              defaultValue={listing?.damages ?? undefined}
              translatedEn={listing?.damagesEn ?? undefined}
              label="상태 · 설명"
              placeholder="상태, 구성품, 특이사항 등"
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
            placeholder="예: 2024"
            defaultValue={
              listing?.year && listing.year >= 1980
                ? listing.year.toString()
                : undefined
            }
            className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
          />
        </label>
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
              버튼 한 번으로 설정 · 한국 시간(KST) 기준 · 마감 후 회원에게 숨김
            </p>

            <div className="mt-2.5 grid gap-3 sm:grid-cols-[1fr_14rem] sm:items-end">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {AUCTION_QUICK_PRESETS.map((preset) => {
                    const active = auctionPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyAuctionPreset(preset)}
                        className={`h-9 rounded border text-[12.5px] font-medium tracking-wide transition ${
                          active
                            ? "border-rose-700 bg-rose-700 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-rose-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {AUCTION_CLOCK_PRESETS.map((preset) => {
                    const active = auctionPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyAuctionPreset(preset)}
                        className={`h-9 rounded border text-[12.5px] font-medium tracking-wide transition ${
                          active
                            ? "border-neutral-800 bg-neutral-800 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] tracking-wide outline-none focus:border-neutral-400"
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
            />
            <InternalCostFields
              auctionPrice={listing?.auctionPrice ?? undefined}
              incidentalCost={listing?.incidentalCost ?? undefined}
            />
          </div>
        </div>
      ) : null}

      {listing ? <input type="hidden" name="manageImages" value="1" /> : null}
      {keptCover ? (
        <input type="hidden" name="keepImageIds" value={keptCover.id} />
      ) : null}
      {keptGallery.map((img) => (
        <input key={img.id} type="hidden" name="keepImageIds" value={img.id} />
      ))}

      {partsMode ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="block text-[13px] font-medium tracking-wide text-neutral-600">
              사진
              <span className="font-normal text-neutral-400">
                {" "}
                · 여러 장 한 번에 선택 · 첫 장이 대표 사진 · 최대{" "}
                {MAX_IMAGES_PER_USED_PARTS}장
              </span>
            </span>
            {listing &&
            (keptCover || keptGallery.length > 0 || partsFiles.length > 0) ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      "선택한 사진과 보관 중인 사진을 모두 삭제할까요?",
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
                사진 전체 삭제
              </button>
            ) : null}
          </div>

          <ImageDropZone
            inputRef={galleryInputRef}
            name="partsImages"
            accept={IMAGE_ACCEPT}
            multiple
            browseLabel="사진 선택"
            hint={
              partsFiles.length > 0
                ? `${partsFiles.length}장 선택됨 · 첫 장: 대표 · 다시 선택 가능`
                : "드래그하여 놓거나 선택 · JPG/PNG/WEBP/GIF · 여러 장"
            }
            onFiles={(files) => applyPartsFiles(files)}
            onInputChange={(e) => {
              applyPartsFiles(e.target.files ?? []);
            }}
          />

          {partsPreviews.length > 0 ? (
            <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {partsPreviews.map((url, index) => (
                <div key={url} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full rounded-sm border border-neutral-200 object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute left-0.5 top-0.5 rounded bg-neutral-900/80 px-1 py-0.5 text-[9px] font-semibold text-white">
                      대표
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {listing && (keptCover || keptGallery.length > 0) ? (
            <div className="mt-2">
              <p className="mb-1.5 text-[12px] tracking-wide text-neutral-500">
                보관 중인 사진
                {partsFiles.length > 0
                  ? " · 새 사진을 올리면 대표는 새 첫 장으로 바뀝니다"
                  : ""}
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
                {[
                  ...(keptCover ? [keptCover] : []),
                  ...keptGallery,
                ].map((img, index) => (
                  <div key={img.id} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full rounded-sm border border-neutral-200 object-cover"
                    />
                    {index === 0 && !partsFiles.length ? (
                      <span className="absolute left-0.5 top-0.5 rounded bg-neutral-900/80 px-1 py-0.5 text-[9px] font-semibold text-white">
                        대표
                      </span>
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
                      aria-label="사진 삭제"
                      title="삭제"
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
      <div className="space-y-3 text-sm">
        <div>
          <span className="mb-1 block text-[13px] font-medium tracking-wide text-neutral-600">
            대표(메인) 사진
            {listing ? (
              <span className="font-normal text-neutral-400">
                {" "}
                (삭제 후 새 사진을 올리거나, 추가 사진이 대표로 승격됩니다)
              </span>
            ) : (
              <span className="font-normal text-neutral-400">
                {" "}
                · 목록·카드에 표시됩니다
              </span>
            )}
          </span>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {(coverPreview || keptCover?.url) && (
              <div className="relative h-[4.5rem] w-full shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 sm:w-[7.5rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview ?? keptCover!.url}
                  alt="대표 사진 미리보기"
                  className="h-full w-full object-cover"
                />
                {listing && !coverPreview && keptCover ? (
                  <button
                    type="button"
                    onClick={() => setKeptCover(null)}
                    className="absolute right-1 top-1 inline-flex h-6 items-center rounded bg-black/70 px-1.5 text-[11px] font-medium text-white hover:bg-black/85"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            )}

            <ImageDropZone
              className="min-w-0 flex-1"
              inputRef={coverInputRef}
              name="coverImage"
              accept={IMAGE_ACCEPT}
              browseLabel="대표 사진 선택"
              hint={
                coverName
                  ? coverName
                  : "드래그하여 놓거나 선택 · JPG/PNG/WEBP/GIF · 1장"
              }
              onFiles={(files) => {
                const file = files.find(isImageFile) ?? null;
                if (!file) {
                  setError("이미지 파일만 등록할 수 있습니다.");
                  return;
                }
                setError(null);
                if (coverInputRef.current) {
                  assignInputFiles(coverInputRef.current, [file], false);
                }
                applyCoverFile(file);
              }}
              onInputChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                applyCoverFile(file);
              }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <span className="block text-[13px] font-medium tracking-wide text-neutral-600">
              추가 사진
              <span className="font-normal text-neutral-400">
                {" "}
                · 대표 사진 포함 최대 {MAX_IMAGES_PER_LISTING}장
                {listing ? " · 개별 × 또는 전체 삭제" : ""}
              </span>
            </span>
            {listing && (keptGallery.length > 0 || photoCount > 0) ? (
              <button
                type="button"
                onClick={() => {
                  const parts: string[] = [];
                  if (keptGallery.length > 0) {
                    parts.push(`보관 중인 추가 사진 ${keptGallery.length}장`);
                  }
                  if (photoCount > 0) {
                    parts.push(`새로 선택한 사진 ${photoCount}장`);
                  }
                  if (
                    !confirm(
                      `${parts.join("과 ")}을(를) 모두 삭제할까요?\n삭제 후 아래에서 새 사진을 등록할 수 있습니다.`,
                    )
                  ) {
                    return;
                  }
                  setKeptGallery([]);
                  setPhotoCount(0);
                  if (galleryInputRef.current) {
                    galleryInputRef.current.value = "";
                  }
                  setError(null);
                }}
                className="inline-flex h-7 shrink-0 items-center rounded-md border border-red-200 bg-white px-2.5 text-[12px] font-medium tracking-wide text-red-700 transition hover:bg-red-50"
              >
                추가 사진 전체 삭제
                {keptGallery.length + photoCount > 0
                  ? ` (${keptGallery.length + photoCount})`
                  : ""}
              </button>
            ) : null}
          </div>

          <ImageDropZone
            inputRef={galleryInputRef}
            name="images"
            accept={IMAGE_ACCEPT}
            multiple
            browseLabel="추가 사진 선택"
            hint={
              photoCount > 0
                ? `${photoCount}장 선택됨 (최대 99장) · 드래그로 다시 지정 가능`
                : "드래그하여 놓거나 선택 · JPG/PNG · 최대 99장"
            }
            onFiles={(files) => applyGalleryFiles(files)}
            onInputChange={(e) => {
              applyGalleryFiles(e.target.files ?? []);
            }}
          />

          {keptGallery.length > 0 ? (
            <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {keptGallery.map((img) => (
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
                      setKeptGallery((prev) =>
                        prev.filter((item) => item.id !== img.id),
                      )
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
          {listing && keptGallery.length === 0 ? (
            <p className="mt-1.5 text-[12px] tracking-wide text-neutral-400">
              보관 중인 추가 사진이 없습니다. 위에서 새로 추가할 수 있습니다.
            </p>
          ) : null}
        </div>
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
            ? progress?.startsWith("사진 최적화")
              ? "최적화 중…"
              : "저장 중…"
            : listing
              ? "매물 수정"
              : "매물 등록"}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-[13.5px] font-medium tracking-wide text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            취소
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
}: {
  defaultValue?: string;
  translatedEn?: string;
  label?: string;
  placeholder?: string;
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
        Enter로 줄바꿈할 수 있습니다. 저장 시 영문으로 번역되어 사이트에
        노출됩니다.
        {translatedEn ? (
          <>
            {" "}
            현재 공개 문구:{" "}
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

function InboundDateFields({ inboundDate }: { inboundDate?: string }) {
  const [inbound, setInbound] = useState(() =>
    digitsOnly(inboundDate ?? "").slice(0, 8),
  );
  const days = calcDaysFromInbound(inbound);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          입고일자
        </span>
        <input
          name="inboundDate"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 20260719"
          value={inbound}
          onChange={(e) => setInbound(digitsOnly(e.target.value).slice(0, 8))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          누적일
          <span className="ml-1.5 font-normal text-neutral-400">
            (입고일 ~ 오늘)
          </span>
        </span>
        <input type="hidden" name="accumulatedDays" value={days} />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          tabIndex={-1}
          placeholder="입고일자 입력 시 자동 계산"
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
}: {
  auctionPrice?: string;
  incidentalCost?: string;
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
        </span>
        <input
          name="auctionPrice"
          type="text"
          inputMode="numeric"
          autoComplete="off"
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
          {dragOver ? "여기에 놓아 등록" : browseLabel}
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
        파일 선택
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
