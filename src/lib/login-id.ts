import { z } from "zod";

/** User.email column stores the login ID (email-style or plain ID). */
export const LOGIN_ID_MIN = 2;
export const LOGIN_ID_MAX = 64;

export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}

export const loginIdSchema = z
  .string()
  .trim()
  .min(LOGIN_ID_MIN, "ID must be at least 2 characters")
  .max(LOGIN_ID_MAX, "ID is too long")
  .regex(
    /^[a-zA-Z0-9._@+-]+$/,
    "ID may only contain letters, numbers, and . _ @ + -",
  )
  .transform(normalizeLoginId);

/** Password: at least 6 chars, mix of letters and numbers. */
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const PASSWORD_HINT =
  "At least 6 characters, mixing letters and numbers.";

export const PASSWORD_HINT_KO =
  "6자 이상, 영문과 숫자를 함께 입력해 주세요.";
