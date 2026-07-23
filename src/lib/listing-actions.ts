import { mkdir, statfs, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { z } from "zod";
import type { ListingCategory } from "@prisma/client";
import { DEFAULT_LISTING_WHATSAPP } from "@/lib/contact";
import { getAppTempDir, getUploadsDir } from "@/lib/storage-paths";
import { translateToEnglish } from "@/lib/translate";

/** Prefer volume tmp over tiny container /tmp (multipart + libvips). */
function ensureUploadTempEnv() {
  const tmp = getAppTempDir();
  if (process.env.TMPDIR !== tmp) process.env.TMPDIR = tmp;
  if (process.env.TMP !== tmp) process.env.TMP = tmp;
  if (process.env.TEMP !== tmp) process.env.TEMP = tmp;
  if (!process.env.VIPS_DISC_THRESHOLD?.trim()) {
    process.env.VIPS_DISC_THRESHOLD = "512m";
  }
}

let sharpTuned = false;
function tuneSharpForUploads() {
  if (sharpTuned) return;
  sharpTuned = true;
  // Lower peak RAM/disk while saving many listing photos in one request.
  sharp.concurrency(1);
  sharp.cache({ memory: 32, files: 0, items: 16 });
}

function isNoSpaceError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code ?? "") : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "ENOSPC" || /ENOSPC|no space left on device/i.test(message);
}

function mapUploadError(err: unknown): Error {
  if (isNoSpaceError(err)) {
    return new Error(
      "서버 저장 공간이 부족하여 사진을 저장하지 못했습니다. 사진 수를 줄이거나, 관리자 유지보수에서 백업·용량을 확인한 뒤 다시 시도해 주세요.",
    );
  }
  if (err instanceof Error) return err;
  return new Error("이미지 저장에 실패했습니다.");
}

const MIN_FREE_UPLOAD_BYTES = 120 * 1024 * 1024;

async function assertUploadSpace(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    const st = await statfs(dir);
    const free = Number(st.bavail) * Number(st.bsize);
    if (Number.isFinite(free) && free < MIN_FREE_UPLOAD_BYTES) {
      throw new Error(
        "서버 저장 공간이 부족합니다. 관리자 유지보수에서 백업을 정리하거나 볼륨 용량을 늘린 뒤 다시 시도해 주세요.",
      );
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("저장 공간") || isNoSpaceError(err))
    ) {
      throw mapUploadError(err);
    }
    // statfs unsupported — continue; write path still maps ENOSPC.
  }
}

const optionalDigits = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const digits = v.replace(/\D/g, "");
    return digits || undefined;
  });

const TRANSMISSION_VALUES = [
  "Automatic",
  "Manual",
  "CVT",
  "DCT",
  "Semi-automatic",
  "Other",
] as const;

const TRANSMISSION_LEGACY: Record<string, (typeof TRANSMISSION_VALUES)[number]> =
  {
    자동: "Automatic",
    수동: "Manual",
    세미오토: "Semi-automatic",
    기타: "Other",
  };

function normalizeTransmission(value: string) {
  if ((TRANSMISSION_VALUES as readonly string[]).includes(value)) return value;
  return TRANSMISSION_LEGACY[value] ?? value;
}

const FUEL_VALUES = [
  "Gasoline",
  "Diesel",
  "LPG",
  "Electric",
  "Hybrid(Electric+Gasoline)",
  "Hybrid(Electric+Diesel)",
  "Hydrogen",
  "Other",
] as const;

const FUEL_LEGACY: Record<string, (typeof FUEL_VALUES)[number]> = {
  가솔린: "Gasoline",
  디젤: "Diesel",
  전기: "Electric",
  수소: "Hydrogen",
  기타: "Other",
};

function normalizeFuelType(value: string) {
  if ((FUEL_VALUES as readonly string[]).includes(value)) return value;
  return FUEL_LEGACY[value] ?? value;
}

const listingFieldsSchema = z.object({
  category: z.enum(["HOT_DEALS", "CAR_LISTINGS", "LIVE_AUCTION", "STAND_BY"]),
  year: z.coerce.number().int().min(1980).max(2100),
  make: z.string().min(1),
  model: z.string().min(1),
  vin: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const normalized = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      return normalized || undefined;
    })
    .refine(
      (v) => !v || /^[A-Z0-9]+$/.test(v),
      "차대번호는 대문자와 숫자만 입력할 수 있습니다.",
    ),
  highlights: z.string().optional(),
  engineMark: z.string().optional(),
  transmission: z.enum(TRANSMISSION_VALUES),
  engineStatus: z.string().optional(),
  odometer: z.string().optional(),
  damages: z.string().optional(),
  fuelType: z.enum(FUEL_VALUES),
  youtubeUrl: z.string().optional(),
  whatsappNumber: z.string().min(6),
  vehicleNumber: z.string().optional(),
  storageLocation: z.enum(["진천사업소", "충주사업소"]).optional(),
  inboundDate: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const digits = v.replace(/\D/g, "");
      return digits || undefined;
    })
    .refine(
      (v) => !v || v.length === 8,
      "입고일자는 8자리 숫자(YYYYMMDD)로 입력해 주세요.",
    ),
  auctionPrice: optionalDigits,
  incidentalCost: optionalDigits,
  costPrice: optionalDigits,
  accumulatedDays: optionalDigits,
});

export function buildListingTitle(year: number, make: string, model: string) {
  return `${year} ${make} ${model}`.trim();
}

export function formDataToListingInput(formData: FormData) {
  const raw = {
    category: String(formData.get("category") ?? "") as ListingCategory,
    year: formData.get("year"),
    make: String(formData.get("make") ?? ""),
    model: String(formData.get("model") ?? ""),
    vin: emptyToUndef(formData.get("vin")),
    highlights: emptyToUndef(formData.get("highlights")),
    engineMark: emptyToUndef(formData.get("engineMark")),
    transmission: normalizeTransmission(
      String(formData.get("transmission") ?? ""),
    ),
    engineStatus: emptyToUndef(formData.get("engineStatus")),
    odometer: emptyToUndef(formData.get("odometer")),
    damages: emptyToUndef(formData.get("damages")),
    fuelType: normalizeFuelType(String(formData.get("fuelType") ?? "")),
    youtubeUrl: emptyToUndef(formData.get("youtubeUrl")),
    whatsappNumber:
      String(formData.get("whatsappNumber") ?? "").trim() ||
      DEFAULT_LISTING_WHATSAPP,
    vehicleNumber: emptyToUndef(formData.get("vehicleNumber")),
    storageLocation: emptyToUndef(formData.get("storageLocation")),
    inboundDate: emptyToUndef(formData.get("inboundDate")),
    auctionPrice: emptyToUndef(formData.get("auctionPrice")),
    incidentalCost: emptyToUndef(formData.get("incidentalCost")),
    costPrice: emptyToUndef(formData.get("costPrice")),
    accumulatedDays: emptyToUndef(formData.get("accumulatedDays")),
  };
  const data = listingFieldsSchema.parse(raw);
  const auction = Number(data.auctionPrice ?? "0") || 0;
  const incidental = Number(data.incidentalCost ?? "0") || 0;
  const hasCostInputs = Boolean(data.auctionPrice || data.incidentalCost);
  // Use null (not undefined) so Prisma clears fields on update when emptied.
  const costPrice = hasCostInputs ? String(auction + incidental) : null;
  const accumulatedDays = data.inboundDate
    ? String(calcAccumulatedDays(data.inboundDate))
    : null;

  return {
    ...data,
    vin: data.vin ?? null,
    highlights: data.highlights ?? null,
    engineMark: data.engineMark ?? null,
    engineStatus: data.engineStatus ?? null,
    odometer: data.odometer ?? null,
    damages: data.damages ?? null,
    youtubeUrl: data.youtubeUrl ?? null,
    vehicleNumber: data.vehicleNumber ?? null,
    storageLocation: data.storageLocation ?? null,
    inboundDate: data.inboundDate ?? null,
    auctionPrice: data.auctionPrice ?? null,
    incidentalCost: data.incidentalCost ?? null,
    costPrice,
    accumulatedDays,
    title: buildListingTitle(data.year, data.make, data.model),
  };
}

export type ListingInput = ReturnType<typeof formDataToListingInput>;

/** Attach English notes for public display (auto-translate Korean). */
export async function withPublicNotesTranslation<T extends ListingInput>(
  data: T,
): Promise<T & { damagesEn: string | null }> {
  if (!data.damages) {
    return { ...data, damagesEn: null };
  }
  const damagesEn = await translateToEnglish(data.damages);
  return { ...data, damagesEn };
}

/** Days from inbound YYYYMMDD to today (local). Same day → 0. */
export function calcAccumulatedDays(inboundYyyymmdd: string): number {
  const digits = inboundYyyymmdd.replace(/\D/g, "");
  if (digits.length !== 8) return 0;
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  const inbound = new Date(y, m - 1, d);
  if (Number.isNaN(inbound.getTime())) return 0;
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = startToday.getTime() - inbound.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/** Prefer live days from inboundDate; fall back to stored accumulatedDays. */
export function displayAccumulatedDays(listing: {
  inboundDate?: string | null;
  accumulatedDays?: string | null;
}): number | null {
  const inbound = listing.inboundDate?.replace(/\D/g, "") ?? "";
  if (inbound.length === 8) {
    return calcAccumulatedDays(inbound);
  }
  const stored = listing.accumulatedDays?.replace(/\D/g, "") ?? "";
  if (!stored) return null;
  const n = Number(stored);
  return Number.isFinite(n) ? n : null;
}

export function generateSerialNumber() {
  return `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function emptyToUndef(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s ? s : undefined;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB (pre-compression upload limit)
export const MAX_IMAGES_PER_LISTING = 100;
/** Longest edge after resize — keeps detail for listings without huge files. */
const MAX_IMAGE_EDGE = 1920;
/** Mild JPEG quality — visibly clean, meaningfully smaller files. */
const JPEG_QUALITY = 78;
/** One-at-a-time avoids /tmp + RAM spikes on 50+ photo uploads. */
const UPLOAD_CONCURRENCY = 1;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
]);
const ALLOWED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

function uploadsDir() {
  return getUploadsDir();
}

/** Delete local `/uploads/...` files (best-effort; ignores missing files). */
export async function deleteUploadedFiles(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      if (!url.startsWith("/uploads/")) return;
      const name = path.basename(url);
      if (!name || name === "." || name === "..") return;
      try {
        await unlink(path.join(uploadsDir(), name));
      } catch {
        /* already gone */
      }
    }),
  );
}

async function compressListingImage(input: Buffer) {
  const pipeline = sharp(input, {
    failOn: "none",
    animated: false,
    sequentialRead: true,
    limitInputPixels: 40_000_000,
  });
  const meta = await pipeline.metadata();
  if (meta.format && !ALLOWED_SHARP_FORMATS.has(meta.format)) {
    throw new Error("unsupported");
  }
  return pipeline
    .rotate()
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

async function saveImageFile(file: File) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지 한 장당 8MB 이하만 업로드할 수 있습니다.");
  }
  const typeOk =
    !file.type ||
    ALLOWED_IMAGE_TYPES.has(file.type) ||
    file.type === "application/octet-stream";
  if (!typeOk) {
    throw new Error("JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.");
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await mkdir(getAppTempDir(), { recursive: true });

  let input: Buffer | null = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await compressListingImage(input);
  } catch (err) {
    if (isNoSpaceError(err)) throw mapUploadError(err);
    throw new Error("이미지를 처리할 수 없습니다. 다른 파일을 시도해 주세요.");
  } finally {
    input = null;
  }

  const filename = `${randomUUID()}.jpg`;
  try {
    await writeFile(path.join(dir, filename), output);
  } catch (err) {
    throw mapUploadError(err);
  }
  return `/uploads/${filename}`;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!);
    }
  }
  const agents = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => run(),
  );
  await Promise.all(agents);
  return results;
}

function fileFromForm(entry: FormDataEntryValue | null) {
  return entry instanceof File && entry.size > 0 ? entry : null;
}

/** Cover (대표) + gallery uploads. Cover is always first in `urls`. */
export async function saveListingImageUploads(formData: FormData) {
  ensureUploadTempEnv();
  tuneSharpForUploads();

  const coverFile = fileFromForm(formData.get("coverImage"));
  const galleryFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const total = (coverFile ? 1 : 0) + galleryFiles.length;
  if (total > MAX_IMAGES_PER_LISTING) {
    throw new Error(
      `이미지는 대표 사진 포함 최대 ${MAX_IMAGES_PER_LISTING}장까지 업로드할 수 있습니다.`,
    );
  }

  await assertUploadSpace(uploadsDir());

  const savedUrls: string[] = [];
  try {
    const coverUrl = coverFile ? await saveImageFile(coverFile) : null;
    if (coverUrl) savedUrls.push(coverUrl);

    const galleryUrls = await mapPool(
      galleryFiles,
      UPLOAD_CONCURRENCY,
      async (file) => {
        const url = await saveImageFile(file);
        savedUrls.push(url);
        return url;
      },
    );

    return {
      coverUrl,
      galleryUrls,
      /** Ordered list for full replace: cover first, then gallery */
      urls: coverUrl ? [coverUrl, ...galleryUrls] : galleryUrls,
      hasUpload: Boolean(coverUrl || galleryUrls.length),
    };
  } catch (err) {
    await deleteUploadedFiles(savedUrls);
    throw mapUploadError(err);
  }
}

/** @deprecated Prefer saveListingImageUploads — kept for any legacy callers */
export async function saveUploadedImages(formData: FormData) {
  const { urls } = await saveListingImageUploads(formData);
  return urls;
}

/** Format stored digit string for admin display (e.g. 100000 → 100,000). */
export function formatAdminNumber(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/** Format YYYYMMDD → YYYY-MM-DD for display. */
export function formatInboundDate(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
