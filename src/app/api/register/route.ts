import { NextResponse } from "next/server";

/**
 * Legacy JSON register endpoint — disabled.
 * Use the /join server action instead (rate-limited).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Registration via this API is disabled. Please use the Join page.",
    },
    { status: 410 },
  );
}
