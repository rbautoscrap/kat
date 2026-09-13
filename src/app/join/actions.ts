"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { loginIdSchema, passwordSchema } from "@/lib/login-id";
import { phoneSchema } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { resolveSignupDeviceId } from "@/lib/signup-device";
import {
  hashSignupIp,
  phoneKeyFromPhone,
  SIGNUP_BLOCKING_STATUSES,
  SIGNUP_DUP_MESSAGES,
} from "@/lib/signup-guard";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: loginIdSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterState =
  | { ok: true; loginId: string }
  | { ok: false; error: string }
  | null;

function isBusyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /SQLITE_BUSY|database is locked|P1008|P1017/i.test(text);
}

export async function registerAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`join:${ip}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return {
      ok: false,
      error: "Too many registration attempts. Please try again later.",
    };
  }

  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const loginId = parsed.data.email;
  const phone = parsed.data.phone;
  const phoneKey = phoneKeyFromPhone(phone);
  if (!phoneKey) {
    return {
      ok: false,
      error: "Enter a valid contact number (at least 8 digits)",
    };
  }

  let signupIpHash: string | null = null;
  try {
    signupIpHash = hashSignupIp(ip);
  } catch {
    signupIpHash = null;
  }

  const signupDeviceId = await resolveSignupDeviceId();

  try {
    const exists = await prisma.user.findUnique({ where: { email: loginId } });
    if (exists) {
      return { ok: false, error: "This ID is already registered" };
    }

    const phoneTaken = await prisma.user.findFirst({
      where: {
        status: { in: SIGNUP_BLOCKING_STATUSES },
        OR: [{ phoneKey }, { phoneKey: null, phone }],
      },
      select: { id: true },
    });
    if (phoneTaken) {
      return { ok: false, error: SIGNUP_DUP_MESSAGES.phone };
    }
  } catch (error) {
    console.error("registerAccount lookup failed:", error);
    return {
      ok: false,
      error: "Registration is busy. Please try again in a moment.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const data = {
    name: parsed.data.name,
    email: loginId,
    phone,
    phoneKey,
    signupIpHash,
    signupDeviceId,
    passwordHash,
    role: "MEMBER" as const,
    status: "PENDING" as const,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.user.create({ data });
      return { ok: true, loginId };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = String(error.meta?.target ?? "");
        if (target.includes("phoneKey") || target.includes("phone")) {
          return { ok: false, error: SIGNUP_DUP_MESSAGES.phone };
        }
        if (target.includes("email")) {
          return { ok: false, error: "This ID is already registered" };
        }
        return { ok: false, error: SIGNUP_DUP_MESSAGES.phone };
      }
      if (attempt === 0 && isBusyError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      console.error("registerAccount failed:", error);
      return {
        ok: false,
        error: "Registration failed. Please try again in a moment.",
      };
    }
  }

  return {
    ok: false,
    error: "Registration failed. Please try again in a moment.",
  };
}
