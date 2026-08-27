import "server-only";

import { prisma } from "@/lib/prisma";

const SETTING_ID = "main";

export async function isPriceInquiryHoliday() {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { id: SETTING_ID },
      select: { priceInquiryHoliday: true },
    });
    return Boolean(row?.priceInquiryHoliday);
  } catch {
    return false;
  }
}

export async function setPriceInquiryHoliday(enabled: boolean) {
  await prisma.siteSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, priceInquiryHoliday: enabled },
    update: { priceInquiryHoliday: enabled },
  });
}
