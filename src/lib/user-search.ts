import type { Prisma } from "@prisma/client";

/**
 * Match name, login id (email), or phone.
 * Digit-only phone broadening runs only when the query looks like a phone
 * number — not when searching an ID/email that happens to contain digits
 * (e.g. this006@naver.com → must not match every phone containing "006").
 */
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
  const looksLikePhone = /^[\d\s+\-().]+$/.test(term);
  if (looksLikePhone && digits.length >= 3) {
    or.push({ phone: { contains: digits } });
    or.push({ phoneKey: { contains: digits } });
  }

  return { OR: or };
}
