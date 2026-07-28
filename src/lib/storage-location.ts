/** Canonical storage locations used across listing forms and inventory. */
export const STORAGE_LOCATIONS = ["진천사업소", "충주사업소"] as const;

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const UNASSIGNED_STORAGE_LABEL = "미지정";

export function isStorageLocation(value: string): value is StorageLocation {
  return (STORAGE_LOCATIONS as readonly string[]).includes(value);
}

/**
 * Normalize free-text / legacy storage values to a known location.
 * Returns null when empty / unassigned.
 */
export function canonicalizeStorageLocation(
  value?: string | null,
): StorageLocation | string | null {
  if (value == null) return null;
  const cleaned = String(value)
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return null;

  if (cleaned === "진천사업소" || cleaned.includes("진천")) {
    return "진천사업소";
  }
  if (cleaned === "충주사업소" || cleaned.includes("충주")) {
    return "충주사업소";
  }

  return cleaned;
}

export function storageLocationLabel(value?: string | null): string {
  return canonicalizeStorageLocation(value) ?? UNASSIGNED_STORAGE_LABEL;
}
