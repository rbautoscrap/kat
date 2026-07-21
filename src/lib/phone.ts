import { z } from "zod";

/** Normalize contact phone for storage (keep leading +, strip other noise). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Contact number is required")
  .transform(normalizePhone)
  .refine((v) => v.replace(/\D/g, "").length >= 8, {
    message: "Enter a valid contact number (at least 8 digits)",
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const normalized = normalizePhone(v);
    return normalized || null;
  })
  .refine((v) => v === null || v.replace(/\D/g, "").length >= 8, {
    message: "연락처는 숫자 8자 이상이어야 합니다.",
  });
