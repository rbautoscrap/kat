import "server-only";

import { prisma } from "@/lib/prisma";

const SETTING_ID = "main";
const HOLIDAY_CACHE_MS = 15_000;

let holidayCache: { at: number; value: boolean } | null = null;

export async function isPriceInquiryHoliday() {
  if (
    holidayCache &&
    Date.now() - holidayCache.at < HOLIDAY_CACHE_MS
  ) {
    return holidayCache.value;
  }
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { id: SETTING_ID },
      select: { priceInquiryHoliday: true },
    });
    const value = Boolean(row?.priceInquiryHoliday);
    holidayCache = { at: Date.now(), value };
    return value;
  } catch {
    holidayCache = { at: Date.now(), value: false };
    return false;
  }
}

export async function setPriceInquiryHoliday(enabled: boolean) {
  await prisma.siteSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, priceInquiryHoliday: enabled },
    update: { priceInquiryHoliday: enabled },
  });
  holidayCache = { at: Date.now(), value: enabled };
}
