import { ZodError } from "zod";

/** User-facing API error (never expose raw Prisma / stack traces). */
export function toApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const raw = issue?.message ?? "";
    // Zod v4 default English messages → Korean for listing forms
    if (/expected number to be <=\s*2100/i.test(raw)) {
      return "연식은 4자리 연도(예: 2000)로 입력해 주세요.";
    }
    if (/expected number to be >=\s*1980/i.test(raw)) {
      return "연식은 1980년 이상이어야 합니다.";
    }
    if (/^Too big:/i.test(raw) || /^Too small:/i.test(raw)) {
      return "입력값을 확인해 주세요. 연식은 4자리 연도(예: 2000)입니다.";
    }
    if (raw && !/^Invalid/i.test(raw)) return raw;
    return fallback;
  }

  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code ?? "");
    if (code === "P2002") return "이미 등록된 값이 있습니다.";
    if (code.startsWith("P")) {
      return "데이터베이스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  const message = err instanceof Error ? err.message : "";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";

  if (
    code === "ENOSPC" ||
    /ENOSPC|no space left on device/i.test(message)
  ) {
    return "서버 저장 공간이 부족하여 사진을 저장하지 못했습니다. 사진 수를 줄이거나, 관리자 유지보수에서 백업·용량을 확인한 뒤 다시 시도해 주세요.";
  }

  if (
    message.includes("Unknown argument") ||
    message.includes("prisma.") ||
    message.includes("Invalid `")
  ) {
    return "데이터베이스 스키마가 최신이 아닙니다. 서버를 재시작한 뒤 다시 시도해 주세요.";
  }

  if (message && message.length < 160 && !message.includes("\n")) {
    return message;
  }

  return fallback;
}
