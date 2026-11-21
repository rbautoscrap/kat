import "server-only";

export function telegramPromoConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

/** Post promo text to the configured Telegram chat/channel. */
export async function publishPromoToTelegram(body: string): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
  at: string;
}> {
  const at = new Date().toISOString();
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return {
      ok: false,
      at,
      error:
        "Railway에 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID를 설정해 주세요.",
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: body.slice(0, 4000),
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: {
        message_id?: number;
        chat?: { username?: string; id?: number };
      };
    };
    if (!data.ok) {
      return {
        ok: false,
        at,
        error: data.description || `Telegram HTTP ${res.status}`,
      };
    }
    const msgId = data.result?.message_id;
    const username = data.result?.chat?.username;
    const url =
      username && msgId ? `https://t.me/${username}/${msgId}` : undefined;
    return { ok: true, at, url };
  } catch (error) {
    return {
      ok: false,
      at,
      error: error instanceof Error ? error.message : "Telegram 요청 실패",
    };
  }
}
