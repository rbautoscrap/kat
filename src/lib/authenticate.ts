import bcrypt from "bcryptjs";
import type { AccountStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeLoginId } from "@/lib/login-id";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type UserWithHash = AuthenticatedUser & {
  passwordHash: string;
  status: AccountStatus;
};

export type VerifyCredentialsResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "invalid" | "pending" | "rejected" };

/**
 * Resolve account by login ID (User.email), with a unique display-name
 * fallback for accounts created when Join still collected "Email".
 */
async function findUserWithHash(
  rawLoginId: string,
): Promise<UserWithHash | null> {
  const loginId = normalizeLoginId(rawLoginId);
  if (!loginId) return null;

  const byId = await prisma.user.findUnique({
    where: { email: loginId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });
  if (byId) return byId;

  const byName = await prisma.$queryRaw<UserWithHash[]>`
    SELECT id, email, name, role, status, passwordHash
    FROM User
    WHERE lower(name) = ${loginId}
    LIMIT 2
  `;
  return byName.length === 1 ? byName[0]! : null;
}

export async function verifyCredentials(
  rawLoginId: string,
  password: string,
): Promise<VerifyCredentialsResult> {
  const user = await findUserWithHash(rawLoginId);
  if (!user) return { ok: false, reason: "invalid" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "invalid" };

  // Admins can always sign in (avoids lockout).
  if (user.role !== "ADMIN") {
    if (user.status === "PENDING") return { ok: false, reason: "pending" };
    if (user.status === "REJECTED") return { ok: false, reason: "rejected" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
