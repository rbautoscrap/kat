export const CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+82 10-5817-2207";

export const CONTACT_LINE = `Real-time updates, Contact to WhatsApp | KakaoTalk (${CONTACT_PHONE})`;

/**
 * Default WhatsApp shown on new listing forms and used when the field is left blank.
 * Display format preferred by ops; wa.me uses digits only (see CONTACT_WHATSAPP).
 */
export const DEFAULT_LISTING_WHATSAPP =
  process.env.NEXT_PUBLIC_LISTING_WHATSAPP ?? "+82 1058172207";

/** Digits for wa.me links */
export const CONTACT_WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT ??
  (DEFAULT_LISTING_WHATSAPP.replace(/\D/g, "") || "821058172207");

/** Vehicle price inquiries only (listing detail blue WhatsApp). */
export const PRICE_INQUIRY_WHATSAPP =
  process.env.NEXT_PUBLIC_PRICE_INQUIRY_WHATSAPP ?? "+82 1094002207";

/**
 * KakaoTalk Open Chat or Channel URL (https://open.kakao.com/... or pf.kakao.com/...).
 * Override with NEXT_PUBLIC_KAKAOTALK_URL when needed.
 */
export const CONTACT_KAKAOTALK_URL = (
  process.env.NEXT_PUBLIC_KAKAOTALK_URL ??
  "https://open.kakao.com/o/sRRldQFi"
).trim();

/** Valid http(s) KakaoTalk chat link, or null when not configured. */
export function kakaoTalkLink() {
  const raw = CONTACT_KAKAOTALK_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "rbautoscrap@naver.com";

export const CONTACT_HOURS = "Mon – Fri, 09:00 – 18:00 (KST)";

/** Facebook Page URL (RB AUTO ads / business page) */
export const CONTACT_FACEBOOK_URL = (
  process.env.NEXT_PUBLIC_FACEBOOK_URL ??
  "https://www.facebook.com/people/RB-AUTO/100071434744672/"
).trim();

/**
 * Facebook Messenger chat URL (m.me / page username).
 * Default matches the public Facebook Page rbautoscrap.
 */
export const CONTACT_MESSENGER_URL = (
  process.env.NEXT_PUBLIC_MESSENGER_URL ?? "https://m.me/rbautoscrap"
).trim();

/** Messenger link; optional prefilled text when the client supports it. */
export function messengerLink(text?: string | null) {
  const raw = CONTACT_MESSENGER_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const msg = text?.trim();
    if (msg) url.searchParams.set("text", msg);
    return url.toString();
  } catch {
    return null;
  }
}
