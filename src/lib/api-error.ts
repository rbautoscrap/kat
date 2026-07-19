import { ZodError } from "zod";

/** User-facing API error (never expose raw Prisma / stack traces). */
export function toApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof ZodError) {
    return err.issues[0]?.message ?? fallback;
  }

  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code ?? "");
    if (code === "P2002") return "이미 등록된 값이 있습니다.";
    if (code.startsWith("P")) {
      return "데이터베이스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  const message = err instanceof Error ? err.message : "";
  if (
    message.includes("Unknown argument") ||
    message.includes("prisma.") ||
    message.includes("Invalid `")
  ) {
    return "데이터베이스 스키마가 최신이 아닙니다. 서버를 재시작한 뒤 다시 시도해 주세요.";
  }

  if (message && message.length < 120 && !message.includes("\n")) {
    return message;
  }

  return fallback;
}
