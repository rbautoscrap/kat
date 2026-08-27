"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { setPriceInquiryHoliday } from "@/lib/site-settings";

export async function togglePriceInquiryHoliday(formData: FormData) {
  await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "1";
  await setPriceInquiryHoliday(enabled);
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/listings");
}
