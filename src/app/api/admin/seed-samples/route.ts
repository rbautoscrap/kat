import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { seedSampleListings } from "@/lib/seed-samples";

/** Admin-only: append 25 sample listings × 3 categories (with images). */
export async function POST() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "관리자만 실행할 수 있습니다." }, { status: 403 });
  }

  try {
    const result = await seedSampleListings(dbUser.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[POST /api/admin/seed-samples]", error);
    return NextResponse.json(
      { error: "샘플 매물 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}
