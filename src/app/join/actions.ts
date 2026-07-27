"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
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

export type RegisterState = { error: string } | null;

export async function registerAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`join:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    return {
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
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const loginId = parsed.data.email;
  const phone = parsed.data.phone;
  const phoneKey = phoneKeyFromPhone(phone);
  if (!phoneKey) {
    return { error: "Enter a valid contact number (at least 8 digits)" };
  }

  let signupIpHash: string | null = null;
  try {
    signupIpHash = hashSignupIp(ip);
  } catch {
    return {
      error: "Registration is temporarily unavailable. Please try again later.",
    };
  }

  const signupDeviceId = await resolveSignupDeviceId();

  const exists = await prisma.user.findUnique({ where: { email: loginId } });
  if (exists) {
    return { error: "This ID is already registered" };
  }

  // Phone: unique key + legacy rows that still only have `phone`
  const phoneTaken = await prisma.user.findFirst({
    where: {
      status: { in: SIGNUP_BLOCKING_STATUSES },
      OR: [
        { phoneKey },
        { phoneKey: null, phone },
      ],
    },
    select: { id: true },
  });
  if (phoneTaken) {
    return { error: SIGNUP_DUP_MESSAGES.phone };
  }

  // Also catch legacy phones stored with different formatting but same digits
  const legacyPhoneCandidates = await prisma.user.findMany({
    where: {
      status: { in: SIGNUP_BLOCKING_STATUSES },
      phoneKey: null,
      phone: { not: null },
    },
    select: { id: true, phone: true },
    take: 2000,
  });
  if (
    legacyPhoneCandidates.some(
      (u) => phoneKeyFromPhone(u.phone) === phoneKey,
    )
  ) {
    return { error: SIGNUP_DUP_MESSAGES.phone };
  }

  if (signupIpHash) {
    const ipTaken = await prisma.user.findFirst({
      where: {
        status: { in: SIGNUP_BLOCKING_STATUSES },
        signupIpHash,
      },
      select: { id: true },
    });
    if (ipTaken) {
      return { error: SIGNUP_DUP_MESSAGES.ip };
    }
  }

  const deviceTaken = await prisma.user.findFirst({
    where: {
      status: { in: SIGNUP_BLOCKING_STATUSES },
      signupDeviceId,
    },
    select: { id: true },
  });
  if (deviceTaken) {
    return { error: SIGNUP_DUP_MESSAGES.device };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: loginId,
        phone,
        phoneKey,
        signupIpHash,
        signupDeviceId,
        passwordHash,
        role: "MEMBER",
        status: "PENDING",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target ?? "");
      if (target.includes("phoneKey") || target.includes("phone")) {
        return { error: SIGNUP_DUP_MESSAGES.phone };
      }
      if (target.includes("email")) {
        return { error: "This ID is already registered" };
      }
      return { error: SIGNUP_DUP_MESSAGES.phone };
    }
    console.error("registerAccount failed:", error);
    return {
      error: "Registration failed. Please try again in a moment.",
    };
  }

  redirect(`/login?pending=1&id=${encodeURIComponent(loginId)}`);
}
