"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OfferCurrency } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { OFFER_CURRENCIES } from "@/lib/purchase-offer";
import { prisma } from "@/lib/prisma";
import {
  isExtraLineKey,
  parseOrphanListingKey,
  sumLineAmounts,
} from "@/lib/statement";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const lineAmountSchema = z
  .string()
  .trim()
  .min(1, "품목 금액을 입력해 주세요.")
  .transform((v) => v.replace(/,/g, "").replace(/\s/g, ""))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), {
    message: "올바른 금액을 입력해 주세요.",
  })
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "금액은 0보다 커야 합니다.");

const statementSchema = z.object({
  items: z
    .array(
      z.object({
        lineKey: z.string().min(1),
        label: z.string().trim().max(120).optional(),
        amount: lineAmountSchema,
      }),
    )
    .min(1, "품목을 1개 이상 추가해 주세요.")
    .max(30, "한 번에 최대 30개까지 선택할 수 있습니다."),
  buyerName: z.string().trim().min(1, "거래처명을 입력해 주세요.").max(120),
  buyerPhone: z.string().trim().max(40).optional(),
  buyerAddress: z.string().trim().max(300).optional(),
  buyerUserId: z.string().trim().min(1).optional().nullable(),
  currency: z.enum(OFFER_CURRENCIES),
  includeVat: z.boolean(),
  issueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "발행일을 YYYY-MM-DD 형식으로 입력해 주세요."),
  notes: z.string().trim().max(2000).optional(),
});

type BuiltRow = {
  listingId: string | null;
  isExtra: boolean;
  vehicleLabel: string;
  vin: string | null;
  serialNumber: string;
  vehicleNumber: string | null;
  amount: string;
  sortOrder: number;
};

async function assertAdminUser() {
  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  if (!session?.user || !dbUser || !isAdmin(dbUser.role)) {
    return null;
  }
  return dbUser;
}

async function nextStatementNo(issueDate: string) {
  const prefix = `TS-${issueDate.replace(/-/g, "")}-`;
  const latest = await prisma.transactionStatement.findFirst({
    where: { statementNo: { startsWith: prefix } },
    orderBy: { statementNo: "desc" },
    select: { statementNo: true },
  });
  let seq = 1;
  if (latest?.statementNo) {
    const tail = latest.statementNo.slice(prefix.length);
    const n = Number(tail);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function listingSnapshot(listing: {
  year: number;
  make: string;
  model: string;
  vin: string | null;
  serialNumber: string;
  vehicleNumber: string | null;
}) {
  return {
    vehicleLabel: `${listing.year} ${listing.make} ${listing.model}`.trim(),
    vin: listing.vin?.trim() || null,
    serialNumber: listing.serialNumber,
    vehicleNumber: listing.vehicleNumber?.trim() || null,
  };
}

async function buildItemRows(
  items: Array<{ lineKey: string; label?: string; amount: string }>,
  opts?: { statementId?: string },
) {
  const keys = items.map((i) => i.lineKey);
  const unique = new Set(keys);
  if (unique.size !== keys.length) {
    return { ok: false as const, error: "같은 품목이 중복되었습니다." };
  }

  const listingKeys = keys.filter(
    (key) => !parseOrphanListingKey(key) && !isExtraLineKey(key),
  );
  const listings = listingKeys.length
    ? await prisma.listing.findMany({ where: { id: { in: listingKeys } } })
    : [];
  if (listings.length !== listingKeys.length) {
    return { ok: false as const, error: "일부 매물을 찾을 수 없습니다." };
  }
  const byId = new Map(listings.map((l) => [l.id, l]));

  const orphanItemIds = keys
    .map((key) => parseOrphanListingKey(key))
    .filter((id): id is string => Boolean(id));
  const orphanItems =
    orphanItemIds.length && opts?.statementId
      ? await prisma.transactionStatementItem.findMany({
          where: {
            id: { in: orphanItemIds },
            statementId: opts.statementId,
          },
        })
      : [];
  const orphanById = new Map(orphanItems.map((row) => [row.id, row]));

  const rows: BuiltRow[] = [];

  for (const [index, item] of items.entries()) {
    if (isExtraLineKey(item.lineKey)) {
      const label = item.label?.trim() || "";
      if (!label) {
        return {
          ok: false as const,
          error: "별도 금액 품목명을 입력해 주세요.",
        };
      }
      rows.push({
        listingId: null,
        isExtra: true,
        vehicleLabel: label,
        vin: null,
        serialNumber: "EXTRA",
        vehicleNumber: null,
        amount: item.amount,
        sortOrder: index,
      });
      continue;
    }

    const orphanId = parseOrphanListingKey(item.lineKey);
    if (orphanId) {
      const existing = orphanById.get(orphanId);
      if (!existing) {
        return {
          ok: false as const,
          error: "삭제된 매물 품목을 찾을 수 없습니다. 페이지를 새로고침해 주세요.",
        };
      }
      rows.push({
        listingId: null,
        isExtra: existing.isExtra,
        vehicleLabel: existing.vehicleLabel,
        vin: existing.vin,
        serialNumber: existing.serialNumber,
        vehicleNumber: existing.vehicleNumber,
        amount: item.amount,
        sortOrder: index,
      });
      continue;
    }

    const listing = byId.get(item.lineKey);
    if (!listing) {
      return { ok: false as const, error: "일부 매물을 찾을 수 없습니다." };
    }
    const snap = listingSnapshot(listing);
    rows.push({
      listingId: listing.id,
      isExtra: false,
      ...snap,
      amount: item.amount,
      sortOrder: index,
    });
  }

  return { ok: true as const, rows };
}

function withExtrasLast(rows: BuiltRow[]): BuiltRow[] {
  const listings = rows.filter((r) => !r.isExtra);
  const extras = rows.filter((r) => r.isExtra);
  return [...listings, ...extras].map((row, index) => ({
    ...row,
    sortOrder: index,
  }));
}

function primaryPreview(rows: BuiltRow[]) {
  return rows.find((r) => !r.isExtra) ?? rows[0]!;
}

export async function createStatement(
  input: z.infer<typeof statementSchema>,
): Promise<ActionResult> {
  const admin = await assertAdminUser();
  if (!admin) return { ok: false, error: "권한이 없습니다." };

  const parsed = statementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }

  const built = await buildItemRows(parsed.data.items);
  if (!built.ok) return { ok: false, error: built.error };

  let buyerUserId: string | null = parsed.data.buyerUserId?.trim() || null;
  if (buyerUserId) {
    const member = await prisma.user.findUnique({
      where: { id: buyerUserId },
      select: { id: true },
    });
    if (!member) {
      return { ok: false, error: "선택한 회원을 찾을 수 없습니다." };
    }
  }

  const rows = withExtrasLast(built.rows);
  const first = primaryPreview(rows);
  const totalAmount = sumLineAmounts(rows, parsed.data.currency);
  const statementNo = await nextStatementNo(parsed.data.issueDate);

  try {
    const row = await prisma.transactionStatement.create({
      data: {
        statementNo,
        listingId: first.listingId,
        vehicleLabel: first.vehicleLabel,
        vin: first.vin,
        serialNumber: first.serialNumber,
        vehicleNumber: first.vehicleNumber,
        buyerName: parsed.data.buyerName,
        buyerPhone: parsed.data.buyerPhone || null,
        buyerAddress: parsed.data.buyerAddress || null,
        buyerUserId,
        amount: totalAmount,
        currency: parsed.data.currency as OfferCurrency,
        includeVat: parsed.data.includeVat,
        issueDate: parsed.data.issueDate,
        notes: parsed.data.notes || null,
        createdById: admin.id,
        items: {
          create: rows,
        },
      },
    });
    revalidatePath("/admin/statements");
    return { ok: true, id: row.id };
  } catch (e) {
    console.error("createStatement", e);
    return { ok: false, error: "명세서를 저장하지 못했습니다." };
  }
}

export async function updateStatement(
  id: string,
  input: z.infer<typeof statementSchema>,
): Promise<ActionResult> {
  const admin = await assertAdminUser();
  if (!admin) return { ok: false, error: "권한이 없습니다." };

  const parsed = statementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }

  const existing = await prisma.transactionStatement.findUnique({
    where: { id },
  });
  if (!existing) return { ok: false, error: "명세서를 찾을 수 없습니다." };

  const built = await buildItemRows(parsed.data.items, { statementId: id });
  if (!built.ok) return { ok: false, error: built.error };

  let buyerUserId: string | null = parsed.data.buyerUserId?.trim() || null;
  if (buyerUserId) {
    const member = await prisma.user.findUnique({
      where: { id: buyerUserId },
      select: { id: true },
    });
    if (!member) {
      return { ok: false, error: "선택한 회원을 찾을 수 없습니다." };
    }
  }

  const rows = withExtrasLast(built.rows);
  const first = primaryPreview(rows);
  const totalAmount = sumLineAmounts(rows, parsed.data.currency);

  try {
    await prisma.$transaction([
      prisma.transactionStatementItem.deleteMany({
        where: { statementId: id },
      }),
      prisma.transactionStatement.update({
        where: { id },
        data: {
          listingId: first.listingId,
          vehicleLabel: first.vehicleLabel,
          vin: first.vin,
          serialNumber: first.serialNumber,
          vehicleNumber: first.vehicleNumber,
          buyerName: parsed.data.buyerName,
          buyerPhone: parsed.data.buyerPhone || null,
          buyerAddress: parsed.data.buyerAddress || null,
          buyerUserId,
          amount: totalAmount,
          currency: parsed.data.currency as OfferCurrency,
          includeVat: parsed.data.includeVat,
          issueDate: parsed.data.issueDate,
          notes: parsed.data.notes || null,
          items: {
            create: rows,
          },
        },
      }),
    ]);
    revalidatePath("/admin/statements");
    revalidatePath(`/admin/statements/${id}`);
    return { ok: true, id };
  } catch (e) {
    console.error("updateStatement", e);
    return { ok: false, error: "명세서를 수정하지 못했습니다." };
  }
}

export async function deleteStatement(id: string): Promise<ActionResult> {
  const admin = await assertAdminUser();
  if (!admin) return { ok: false, error: "권한이 없습니다." };

  try {
    await prisma.transactionStatement.delete({ where: { id } });
    revalidatePath("/admin/statements");
    return { ok: true, id };
  } catch (e) {
    console.error("deleteStatement", e);
    return { ok: false, error: "명세서를 삭제하지 못했습니다." };
  }
}
