import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { z } from "zod";
import type { ListingCategory } from "@prisma/client";
import { blurLicensePlates } from "@/lib/plate-blur";
import { getUploadsDir } from "@/lib/storage-paths";
import { translateToEnglish } from "@/lib/translate";

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
  category: z.enum(["HOT_DEALS", "CAR_LISTINGS", "STAND_BY"]),
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
  fuelType: z.enum([
    "Gasoline",
    "Diesel",
    "LPG",
    "Electric",
    "Hydrogen",
    "Other",
  ]),
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
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
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
const JPEG_QUALITY = 80;
/** Limit parallel sharp work under burst uploads. */
const UPLOAD_CONCURRENCY = 3;
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
  const pipeline = sharp(input, { failOn: "none", animated: false });
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

  await mkdir(uploadsDir(), { recursive: true });

  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await compressListingImage(input);
  } catch {
    throw new Error("이미지를 처리할 수 없습니다. 다른 파일을 시도해 주세요.");
  }

  try {
    const blurred = await blurLicensePlates(output);
    output = blurred.buffer;
    if (blurred.platesFound > 0) {
      console.info(
        `[upload] license plate mosaic applied (${blurred.platesFound} region(s))`,
      );
    }
  } catch (error) {
    console.error("[upload] plate blur skipped", error);
  }

  const filename = `${randomUUID()}.jpg`;
  await writeFile(path.join(uploadsDir(), filename), output);
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

  const coverUrl = coverFile ? await saveImageFile(coverFile) : null;
  const galleryUrls = await mapPool(
    galleryFiles,
    UPLOAD_CONCURRENCY,
    saveImageFile,
  );

  return {
    coverUrl,
    galleryUrls,
    /** Ordered list for full replace: cover first, then gallery */
    urls: coverUrl ? [coverUrl, ...galleryUrls] : galleryUrls,
    hasUpload: Boolean(coverUrl || galleryUrls.length),
  };
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
