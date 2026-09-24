import { MAX_IMAGES_PER_GROUP } from "@/lib/listing-images";

export const MAX_LIVE_AUCTION_FOLDER_UNITS = 40;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;

export type ParsedVehicleFolder = {
  year: number;
  make: string;
  model: string;
};

export type AuctionFolderUnit = ParsedVehicleFolder & {
  folder: string;
  files: File[];
};

export function isAuctionFolderImage(file: File) {
  if (file.size <= 0) return false;
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

export function parseVehicleFolderName(name: string): ParsedVehicleFolder {
  const n = name.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const m = n.match(/^(\d{4})\s+(.+)$/);
  let year = new Date().getFullYear();
  let rest = n || "차량";
  if (m) {
    const y = Number(m[1]);
    if (y >= 1980 && y <= 2100) {
      year = y;
      rest = m[2] ?? rest;
    }
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  const make = (parts[0] ?? "차량").slice(0, 80);
  const model = (parts.slice(1).join(" ") || make).slice(0, 80);
  return { year, make, model };
}

function relativeParts(file: File) {
  const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
  return rel.split("/").filter(Boolean);
}

function sortImageFiles(files: File[]) {
  return [...files].sort((a, b) => {
    const an = a.name;
    const bn = b.name;
    return an.localeCompare(bn, "ko", { numeric: true, sensitivity: "base" });
  });
}

/** 선택한 폴더의 바로 아래 하위 폴더 = 매물 1대. 차 폴더만 고르면 그 폴더 1대. */
export function groupAuctionFolderFiles(files: File[]): AuctionFolderUnit[] {
  const images = files.filter(isAuctionFolderImage);
  if (images.length === 0) return [];

  const depths = images.map((f) => relativeParts(f).length);
  const useSubfolders = depths.some((d) => d >= 3);

  const byFolder = new Map<string, File[]>();
  for (const file of images) {
    const parts = relativeParts(file);
    if (useSubfolders) {
      if (parts.length < 3) continue;
      const folder = parts[1] ?? "";
      if (!folder) continue;
      const list = byFolder.get(folder) ?? [];
      list.push(file);
      byFolder.set(folder, list);
    } else if (parts.length >= 2) {
      const folder = parts[0] ?? file.name;
      const list = byFolder.get(folder) ?? [];
      list.push(file);
      byFolder.set(folder, list);
    }
  }

  const units: AuctionFolderUnit[] = [];
  for (const [folder, raw] of byFolder) {
    const sorted = sortImageFiles(raw).slice(0, MAX_IMAGES_PER_GROUP);
    if (sorted.length === 0) continue;
    units.push({ folder, files: sorted, ...parseVehicleFolderName(folder) });
    if (units.length >= MAX_LIVE_AUCTION_FOLDER_UNITS) break;
  }
  return units;
}
