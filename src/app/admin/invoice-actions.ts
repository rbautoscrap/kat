"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OfferCurrency } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  addDaysToDateString,
  calcFinalFromKrw,
  cleanMoney,
  formatTermsLabel,
  isInvoiceExtraKey,
  parseTermsDays,
  sumFinalPrices,
  type InvoiceCurrency,
} from "@/lib/overseas-invoice";
import { prisma } from "@/lib/prisma";
import { shouldAutoListReceivable } from "@/lib/sales-daily";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const moneySchema = z
  .string()
  .trim()
  .min(1, "Amount is required.")
  .transform((v) => cleanMoney(v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount.")
  .refine((v) => Number(v) > 0, "Amount must be greater than 0.");

const invoiceSchema = z.object({
  invoiceDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for invoice date."),
  termsDays: z.number().int().min(1).max(365),
  company: z.string().trim().max(160).optional(),
  consignee: z.string().trim().min(1, "Consignee is required.").max(160),
  businessNo: z.string().trim().max(80).optional(),
  finalDestination: z.string().trim().max(120).optional(),
  currency: z.enum(["EUR", "USD"]),
  exchangeRate: moneySchema,
  prepaidLabel: z.string().trim().min(1).max(80).default("100% PREPAID"),
  items: z
    .array(
      z.object({
        lineKey: z.string().min(1),
        description: z.string().trim().min(1).max(160),
        regNo: z.string().trim().max(60).optional(),
        vin: z.string().trim().max(40).optional(),
        qty: z.string().trim().min(1).max(10),
        priceKrw: moneySchema,
      }),
    )
    .min(1, "Add at least one line item.")
    .max(30),
});

async function assertAdminUser() {
  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  if (!session?.user || !dbUser || !isAdmin(dbUser.role)) return null;
  return dbUser;
}

async function nextInvoiceNo(invoiceDate: string) {
  const prefix = invoiceDate.replace(/-/g, "");
  const existing = await prisma.overseasInvoice.findMany({
    where: { invoiceNo: { startsWith: `${prefix}-` } },
    select: { invoiceNo: true },
  });
  let max = 0;
  for (const row of existing) {
    const n = Number(row.invoiceNo.slice(prefix.length + 1));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${max + 1}`;
}

type BuiltItem = {
  listingId: string | null;
  isExtra: boolean;
  description: string;
  regNo: string | null;
  vin: string | null;
  qty: string;
  priceKrw: string;
  rate: string;
  finalPrice: string;
  sortOrder: number;
};

async function buildItems(
  items: z.infer<typeof invoiceSchema>["items"],
  rate: string,
): Promise<{ ok: true; rows: BuiltItem[] } | { ok: false; error: string }> {
  const listingIds = items
    .map((i) => i.lineKey)
    .filter((k) => !isInvoiceExtraKey(k));

  const listings =
    listingIds.length > 0
      ? await prisma.listing.findMany({
          where: { id: { in: listingIds } },
          select: {
            id: true,
            title: true,
            vin: true,
            vehicleNumber: true,
          },
        })
      : [];
  const byId = new Map(listings.map((l) => [l.id, l]));

  const rows: BuiltItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const finalPrice = calcFinalFromKrw(item.priceKrw, rate);
    if (!finalPrice) {
      return { ok: false, error: "Check KRW price and exchange rate." };
    }

    if (isInvoiceExtraKey(item.lineKey)) {
      rows.push({
        listingId: null,
        isExtra: true,
        description: item.description,
        regNo: item.regNo?.trim() || null,
        vin: item.vin?.trim() || null,
        qty: item.qty.trim() || "1",
        priceKrw: item.priceKrw,
        rate,
        finalPrice,
        sortOrder: i,
      });
      continue;
    }

    const listing = byId.get(item.lineKey);
    if (!listing) {
      return { ok: false, error: "A selected listing was not found." };
    }
    rows.push({
      listingId: listing.id,
      isExtra: false,
      description: item.description.trim() || listing.title,
      regNo: item.regNo?.trim() || listing.vehicleNumber || null,
      vin: item.vin?.trim() || listing.vin || null,
      qty: item.qty.trim() || "1",
      priceKrw: item.priceKrw,
      rate,
      finalPrice,
      sortOrder: i,
    });
  }

  return { ok: true, rows };
}

export async function createOverseasInvoice(input: unknown): Promise<ActionResult> {
  try {
    const admin = await assertAdminUser();
    if (!admin) return { ok: false, error: "권한이 없습니다." };

    const parsed = invoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid invoice.",
      };
    }
    const data = parsed.data;
    const built = await buildItems(data.items, data.exchangeRate);
    if (!built.ok) return built;

    const invoiceNo = await nextInvoiceNo(data.invoiceDate);
    const dueDate = addDaysToDateString(
      data.invoiceDate,
      parseTermsDays(formatTermsLabel(data.termsDays)),
    );
    const amount = sumFinalPrices(built.rows);

    const created = await prisma.overseasInvoice.create({
      data: {
        invoiceNo,
        invoiceDate: data.invoiceDate,
        terms: formatTermsLabel(data.termsDays),
        dueDate,
        company: data.company?.trim() || null,
        consignee: data.consignee,
        businessNo: data.businessNo?.trim() || null,
        finalDestination: data.finalDestination?.trim() || null,
        currency: data.currency as OfferCurrency,
        exchangeRate: data.exchangeRate,
        prepaidLabel: data.prepaidLabel.trim() || "100% PREPAID",
        amount,
        createdById: admin.id,
        items: {
          create: built.rows.map((row) => ({
            ...row,
            inReceivableLedger: shouldAutoListReceivable(data.invoiceDate),
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/sales-daily");
    return { ok: true, id: created.id };
  } catch (error) {
    console.error("[createOverseasInvoice]", error);
    return { ok: false, error: "인보이스 저장에 실패했습니다." };
  }
}

export async function updateOverseasInvoice(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const admin = await assertAdminUser();
    if (!admin) return { ok: false, error: "권한이 없습니다." };

    const existing = await prisma.overseasInvoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "인보이스를 찾을 수 없습니다." };

    const parsed = invoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid invoice.",
      };
    }
    const data = parsed.data;
    const built = await buildItems(data.items, data.exchangeRate);
    if (!built.ok) return built;

    const dueDate = addDaysToDateString(
      data.invoiceDate,
      parseTermsDays(formatTermsLabel(data.termsDays)),
    );
    const amount = sumFinalPrices(built.rows);

    await prisma.$transaction([
      prisma.overseasInvoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.overseasInvoice.update({
        where: { id },
        data: {
          invoiceDate: data.invoiceDate,
          terms: formatTermsLabel(data.termsDays),
          dueDate,
          company: data.company?.trim() || null,
          consignee: data.consignee,
          businessNo: data.businessNo?.trim() || null,
          finalDestination: data.finalDestination?.trim() || null,
          currency: data.currency as InvoiceCurrency,
          exchangeRate: data.exchangeRate,
          prepaidLabel: data.prepaidLabel.trim() || "100% PREPAID",
          amount,
          items: {
            create: built.rows.map((row) => ({
              ...row,
              inReceivableLedger: shouldAutoListReceivable(data.invoiceDate),
            })),
          },
        },
      }),
    ]);

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath("/admin/sales-daily");
    return { ok: true, id };
  } catch (error) {
    console.error("[updateOverseasInvoice]", error);
    return { ok: false, error: "인보이스 수정에 실패했습니다." };
  }
}

export async function deleteOverseasInvoice(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await assertAdminUser();
    if (!admin) return { ok: false, error: "권한이 없습니다." };

    await prisma.overseasInvoice.delete({ where: { id } });
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/sales-daily");
    return { ok: true };
  } catch (error) {
    console.error("[deleteOverseasInvoice]", error);
    return { ok: false, error: "인보이스 삭제에 실패했습니다." };
  }
}
