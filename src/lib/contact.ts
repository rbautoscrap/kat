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

/**
 * KakaoTalk Open Chat or Channel URL (https://open.kakao.com/... or pf.kakao.com/...).
 * Set NEXT_PUBLIC_KAKAOTALK_URL in the environment to enable KakaoTalk buttons.
 */
export const CONTACT_KAKAOTALK_URL = (
  process.env.NEXT_PUBLIC_KAKAOTALK_URL ?? ""
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
