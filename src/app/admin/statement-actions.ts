"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OfferCurrency } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { OFFER_CURRENCIES } from "@/lib/purchase-offer";
import { prisma } from "@/lib/prisma";
import { sumLineAmounts } from "@/lib/statement";

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
        listingId: z.string().min(1),
        amount: lineAmountSchema,
      }),
    )
    .min(1, "매물을 1개 이상 선택해 주세요.")
    .max(30, "한 번에 최대 30개까지 선택할 수 있습니다."),
  buyerName: z.string().trim().min(1, "거래처명을 입력해 주세요.").max(120),
  buyerPhone: z.string().trim().max(40).optional(),
  buyerAddress: z.string().trim().max(300).optional(),
  currency: z.enum(OFFER_CURRENCIES),
  includeVat: z.boolean(),
  issueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "발행일을 YYYY-MM-DD 형식으로 입력해 주세요."),
  notes: z.string().trim().max(2000).optional(),
});

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
  items: Array<{ listingId: string; amount: string }>,
) {
  const ids = items.map((i) => i.listingId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return { ok: false as const, error: "같은 매물이 중복 선택되었습니다." };
  }

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
  });
  if (listings.length !== ids.length) {
    return { ok: false as const, error: "일부 매물을 찾을 수 없습니다." };
  }

  const byId = new Map(listings.map((l) => [l.id, l]));
  const rows = items.map((item, index) => {
    const listing = byId.get(item.listingId)!;
    const snap = listingSnapshot(listing);
    return {
      listingId: listing.id,
      ...snap,
      amount: item.amount,
      sortOrder: index,
    };
  });

  return { ok: true as const, rows };
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

  const first = built.rows[0]!;
  const totalAmount = sumLineAmounts(built.rows, parsed.data.currency);
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
        amount: totalAmount,
        currency: parsed.data.currency as OfferCurrency,
        includeVat: parsed.data.includeVat,
        issueDate: parsed.data.issueDate,
        notes: parsed.data.notes || null,
        createdById: admin.id,
        items: {
          create: built.rows,
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

  const built = await buildItemRows(parsed.data.items);
  if (!built.ok) return { ok: false, error: built.error };

  const first = built.rows[0]!;
  const totalAmount = sumLineAmounts(built.rows, parsed.data.currency);

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
          amount: totalAmount,
          currency: parsed.data.currency as OfferCurrency,
          includeVat: parsed.data.includeVat,
          issueDate: parsed.data.issueDate,
          notes: parsed.data.notes || null,
          items: {
            create: built.rows,
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
