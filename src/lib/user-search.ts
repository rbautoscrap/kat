import type { Prisma } from "@prisma/client";

/** Match name, login id (email), or phone (also by digits only). */
export function buildUserSearchWhere(
  q: string | null | undefined,
): Prisma.UserWhereInput {
  const term = q?.trim() ?? "";
  if (!term) return {};

  const or: Prisma.UserWhereInput[] = [
    { name: { contains: term } },
    { email: { contains: term } },
    { phone: { contains: term } },
  ];

  const digits = term.replace(/\D/g, "");
  if (digits.length >= 3 && digits !== term) {
    or.push({ phone: { contains: digits } });
  }

  return { OR: or };
}
