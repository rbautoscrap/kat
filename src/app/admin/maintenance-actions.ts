"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { createBackupZip, type BackupInfo } from "@/lib/maintenance";

type ActionResult =
  | { ok: true; backup: BackupInfo }
  | { ok: false; error: string };

async function assertAdmin() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) return null;
  return dbUser;
}

export async function runMaintenanceBackup(): Promise<ActionResult> {
  if (!(await assertAdmin())) {
    return { ok: false, error: "권한이 없습니다." };
  }

  try {
    const backup = await createBackupZip();
    revalidatePath("/admin/maintenance");
    return { ok: true, backup };
  } catch (error) {
    console.error("[runMaintenanceBackup]", error);
    return {
      ok: false,
      error: "백업 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
