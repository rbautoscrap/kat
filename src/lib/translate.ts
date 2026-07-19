const HANGUL_RE = /[\uac00-\ud7a3]/;

export function containsHangul(text: string) {
  return HANGUL_RE.test(text);
}

/**
 * Translate Korean (or mixed) text to English for public listing notes.
 * Uses MyMemory free endpoint; falls back to the original text on failure.
 */
export async function translateToEnglish(text: string): Promise<string> {
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
    });
    if (!res.ok) return trimmed;

    const json = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = json.responseData?.translatedText?.trim();
    if (!translated || translated.toUpperCase() === "NULL") return trimmed;
    // MyMemory sometimes echoes the query when it cannot translate
    if (translated === trimmed) return trimmed;
    return translated;
  } catch {
    return trimmed;
  }
}
