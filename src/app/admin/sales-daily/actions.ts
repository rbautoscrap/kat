"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { parseSaleItemKey, SALE_SHIPMENT_TYPES } from "@/lib/sales-daily";

const paidSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, "").replace(/\s/g, ""))
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "올바른 입금액을 입력해 주세요.",
  });

const dateSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "발송일자는 YYYY-MM-DD 형식입니다.",
  });

const shipmentSchema = z
  .string()
  .trim()
  .refine(
    (v) => (SALE_SHIPMENT_TYPES as readonly string[]).includes(v),
    "결재 상태를 확인해 주세요.",
  );

const noteSchema = z.string().trim().max(200, "비고가 너무 깁니다.");

const patchSchema = z
  .object({
    itemId: z.string().min(1),
    paidAmount: paidSchema.optional(),
    shipmentType: shipmentSchema.optional(),
    shippedDate: dateSchema.optional(),
    reportNote: noteSchema.optional(),
  })
  .refine(
    (v) =>
      v.paidAmount !== undefined ||
      v.shipmentType !== undefined ||
      v.shippedDate !== undefined ||
      v.reportNote !== undefined,
    "변경할 값이 없습니다.",
  );

export type SaleTrackingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateSaleTracking(
  input: z.input<typeof patchSchema>,
): Promise<SaleTrackingResult> {
  await requireAdmin();
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }

  const data: {
    paidAmount?: string;
    shipmentType?: string;
    shippedDate?: string;
    reportNote?: string;
  } = {};
  if (parsed.data.paidAmount !== undefined) {
    data.paidAmount = parsed.data.paidAmount;
  }
  if (parsed.data.shipmentType !== undefined) {
    data.shipmentType = parsed.data.shipmentType;
  }
  if (parsed.data.shippedDate !== undefined) {
    data.shippedDate = parsed.data.shippedDate;
  }
  if (parsed.data.reportNote !== undefined) {
    data.reportNote = parsed.data.reportNote;
  }

  const parsedId = parseSaleItemKey(parsed.data.itemId);
  if (!parsedId) return { ok: false, error: "항목을 찾을 수 없습니다." };

  try {
    if (parsedId.source === "invoice") {
      await prisma.overseasInvoiceItem.update({
        where: { id: parsedId.id },
        data,
      });
    } else {
      await prisma.transactionStatementItem.update({
        where: { id: parsedId.id },
        data,
      });
    }
  } catch {
    return { ok: false, error: "항목을 저장하지 못했습니다." };
  }

  revalidatePath("/admin/sales-daily");
  return { ok: true };
}

export async function setReceivableLedger(
  itemId: string,
  listed: boolean,
): Promise<SaleTrackingResult> {
  await requireAdmin();
  const parsedId = parseSaleItemKey(itemId);
  if (!parsedId) return { ok: false, error: "항목을 찾을 수 없습니다." };

  const data = listed
    ? { inReceivableLedger: true }
    : {
        inReceivableLedger: false,
        paidAmount: "",
        shipmentType: "",
        shippedDate: "",
        reportNote: "",
      };

  try {
    if (parsedId.source === "invoice") {
      await prisma.overseasInvoiceItem.update({
        where: { id: parsedId.id },
        data,
      });
    } else {
      await prisma.transactionStatementItem.update({
        where: { id: parsedId.id },
        data,
      });
    }
  } catch {
    return { ok: false, error: "미수 원장을 변경하지 못했습니다." };
  }

  revalidatePath("/admin/sales-daily");
  return { ok: true };
}
