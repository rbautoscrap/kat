const HANGUL_RE = /[\uac00-\ud7a3]/;

export function containsHangul(text: string) {
  return HANGUL_RE.test(text);
}

async function translateChunk(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!containsHangul(trimmed)) return trimmed;

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", trimmed.slice(0, 450));
    url.searchParams.set("langpair", "ko|en");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return trimmed;

    const json = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = json.responseData?.translatedText?.trim();
    if (!translated || translated.toUpperCase() === "NULL") return trimmed;
    if (translated === trimmed) return trimmed;
    return translated;
  } catch {
    return trimmed;
  }
}

/**
 * Translate Korean (or mixed) text to English for public listing notes.
 * Preserves line breaks by translating each line separately.
 */
export async function translateToEnglish(text: string): Promise<string> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  if (lines.length === 1) {
    return translateChunk(lines[0]!);
  }

  const translated = await Promise.all(
    lines.map(async (line) => {
      if (!line.trim()) return "";
      return translateChunk(line);
    }),
  );
  return translated.join("\n");
}
