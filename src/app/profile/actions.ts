"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { loginIdSchema, passwordSchema } from "@/lib/login-id";
import { prisma } from "@/lib/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: loginIdSchema,
  currentPassword: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine(
      (v) => !v || passwordSchema.safeParse(v).success,
      "New password must be at least 6 characters and mix letters and numbers.",
    ),
});

export async function updateProfile(input: {
  name: string;
  email: string;
  currentPassword?: string;
  password?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Please log in to edit your profile." };
  }

  const parsed = profileSchema.safeParse({
    name: input.name,
    email: input.email,
    currentPassword: input.currentPassword?.trim() || undefined,
    password: input.password?.trim() || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "Please check your input.";
    const error =
      issue.startsWith("ID ") || issue.includes("ID may")
        ? "Invalid ID format. Use letters, numbers, and . _ @ + -"
        : issue;
    return { ok: false, error };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  const changingPassword = Boolean(parsed.data.password);
  if (changingPassword) {
    if (!parsed.data.currentPassword) {
      return {
        ok: false,
        error: "Enter your current password to set a new one.",
      };
    }
    const currentOk = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      return { ok: false, error: "Current password is incorrect." };
    }
  }

  const loginIdTaken = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      NOT: { id: user.id },
    },
  });
  if (loginIdTaken) {
    return { ok: false, error: "This ID is already in use." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      ...(changingPassword && parsed.data.password
        ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) }
        : {}),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
