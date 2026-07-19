"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type {
  AccountStatus,
  ListingCategory,
  ListingSaleStatus,
  Role,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { deleteUploadedFiles } from "@/lib/listing-actions";
import { loginIdSchema, passwordSchema } from "@/lib/login-id";
import { prisma } from "@/lib/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ["MEMBER", "AUTHORIZED", "ADMIN"] as const;
const CATEGORIES = ["HOT_DEALS", "CAR_LISTINGS", "STAND_BY"] as const;
const SALE_STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;
const ACCOUNT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  email: loginIdSchema,
  role: z.enum(ROLES),
  password: z
    .string()
    .optional()
    .refine(
      (v) => !v || passwordSchema.safeParse(v).success,
      "비밀번호는 6자 이상이며 영문과 숫자를 함께 포함해야 합니다.",
    ),
});

async function assertAdmin() {
  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  if (!session?.user || !dbUser || !isAdmin(dbUser.role)) {
    return null;
  }
  return session;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function isCategory(value: string): value is ListingCategory {
  return (CATEGORIES as readonly string[]).includes(value);
}

function isSaleStatus(value: string): value is ListingSaleStatus {
  return (SALE_STATUSES as readonly string[]).includes(value);
}

function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

function prismaErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return "대상을 찾을 수 없습니다.";
  }
  console.error(fallback, error);
  return fallback;
}

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) return { ok: false, error: "권한이 없습니다." };

  if (!isRole(role)) {
    return { ok: false, error: "잘못된 역할입니다." };
  }

  if (userId === session.user.id && role !== "ADMIN") {
    return { ok: false, error: "본인의 관리자 권한은 해제할 수 없습니다." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "회원을 찾을 수 없습니다." };

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "관리자는 최소 1명 이상 필요합니다." };
    }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        // Admins must be able to sign in immediately
        ...(role === "ADMIN" ? { status: "APPROVED" as const } : {}),
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "역할 변경에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateListingCategory(
  listingId: string,
  category: ListingCategory,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };

  if (!listingId || !isCategory(category)) {
    return { ok: false, error: "잘못된 카테고리입니다." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) return { ok: false, error: "매물을 찾을 수 없습니다." };

  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: { category },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "카테고리 변경에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function updateListingSaleStatus(
  listingId: string,
  saleStatus: ListingSaleStatus,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };

  if (!listingId || !isSaleStatus(saleStatus)) {
    return { ok: false, error: "잘못된 판매 상태입니다." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) return { ok: false, error: "매물을 찾을 수 없습니다." };

  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: { saleStatus },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "판매 상태 변경에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function setUserAccountStatus(
  userId: string,
  status: AccountStatus,
): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) return { ok: false, error: "권한이 없습니다." };

  if (!isAccountStatus(status)) {
    return { ok: false, error: "잘못된 승인 상태입니다." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "회원을 찾을 수 없습니다." };

  if (target.id === session.user.id && status !== "APPROVED") {
    return { ok: false, error: "본인 계정의 승인을 해제할 수 없습니다." };
  }

  if (target.role === "ADMIN" && status !== "APPROVED") {
    return { ok: false, error: "관리자 계정은 승인 상태를 변경할 수 없습니다." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "승인 상태 변경에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}/edit`);
  return { ok: true };
}

export async function deleteListing(listingId: string): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };

  if (!listingId) return { ok: false, error: "매물을 찾을 수 없습니다." };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      images: { select: { url: true } },
    },
  });
  if (!listing) return { ok: false, error: "매물을 찾을 수 없습니다." };

  try {
    await prisma.listing.delete({ where: { id: listingId } });
    await deleteUploadedFiles(listing.images.map((img) => img.url));
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "매물 삭제에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/");
  revalidatePath("/listings");
  return { ok: true };
}

/** Move listing to the front as if newly registered (updates createdAt). */
export async function bumpListingToFront(
  listingId: string,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };

  if (!listingId) return { ok: false, error: "매물을 찾을 수 없습니다." };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) return { ok: false, error: "매물을 찾을 수 없습니다." };

  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: { createdAt: new Date() },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "상단 이동에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function updateUser(
  userId: string,
  input: {
    name: string;
    email: string;
    role: Role;
    password?: string;
  },
): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) return { ok: false, error: "권한이 없습니다." };

  const parsed = updateUserSchema.safeParse({
    name: input.name.trim(),
    email: input.email,
    role: input.role,
    password: input.password?.trim() || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.";
    const error =
      issue.startsWith("ID ") || issue.includes("ID may")
        ? "아이디 형식을 확인해 주세요. (영문, 숫자, . _ @ + -)"
        : issue;
    return { ok: false, error };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "회원을 찾을 수 없습니다." };

  if (userId === session.user.id && parsed.data.role !== "ADMIN") {
    return { ok: false, error: "본인의 관리자 권한은 해제할 수 없습니다." };
  }

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "관리자는 최소 1명 이상 필요합니다." };
    }
  }

  const emailTaken = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      NOT: { id: userId },
    },
  });
  if (emailTaken) {
    return { ok: false, error: "이미 사용 중인 아이디입니다." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        ...(parsed.data.role === "ADMIN" ? { status: "APPROVED" as const } : {}),
        ...(parsed.data.password
          ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) }
          : {}),
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "회원 정보 저장에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}/edit`);
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) return { ok: false, error: "권한이 없습니다." };

  if (userId === session.user.id) {
    return { ok: false, error: "본인 계정은 삭제할 수 없습니다." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { listings: true } } },
  });
  if (!target) return { ok: false, error: "회원을 찾을 수 없습니다." };

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "마지막 관리자는 삭제할 수 없습니다." };
    }
  }

  try {
    const listingImages = await prisma.listingImage.findMany({
      where: { listing: { authorId: userId } },
      select: { url: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.listing.deleteMany({ where: { authorId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    await deleteUploadedFiles(listingImages.map((img) => img.url));
  } catch (error) {
    return {
      ok: false,
      error: prismaErrorMessage(error, "회원 삭제에 실패했습니다."),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/listings");
  revalidatePath("/");
  revalidatePath("/listings");
  return { ok: true };
}
