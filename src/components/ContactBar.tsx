import {
  CONTACT_FACEBOOK_URL,
  CONTACT_LINE,
  CONTACT_WHATSAPP,
  kakaoTalkLink,
  messengerLink,
} from "@/lib/contact";

export function ContactBar() {
  const kakaoHref = kakaoTalkLink();
  const messengerHref = messengerLink();

  return (
    <div className="border-t border-neutral-800 bg-neutral-950">
      <div className="site-container flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 text-[13.5px] text-neutral-300">
        <span className="min-w-0 break-words leading-snug sm:truncate">
          {CONTACT_LINE}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <a
            href={`https://wa.me/${CONTACT_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2.5 py-0.5 text-[11.5px] font-medium text-[#6eef9a] transition hover:bg-[#25D366]/25"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
          {kakaoHref ? (
            <a
              href={kakaoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[#FEE500]/90 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#191919] transition hover:bg-[#FEE500]"
              aria-label="KakaoTalk"
            >
              <KakaoIcon />
              KakaoTalk
            </a>
          ) : null}
          {messengerHref ? (
            <a
              href={messengerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[#0084FF]/20 px-2.5 py-0.5 text-[11.5px] font-medium text-[#7ec4ff] transition hover:bg-[#0084FF]/30"
              aria-label="Facebook Messenger"
            >
              <MessengerIcon />
              Messenger
            </a>
          ) : null}
          <a
            href={CONTACT_FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2]/20 text-[#8ab4ff] transition hover:bg-[#1877F2]/35"
            aria-label="Facebook page"
            title="Facebook"
          >
            <FacebookIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.42 2.15 11.87c0 1.9.5 3.75 1.45 5.38L2 22l4.9-1.28a9.86 9.86 0 0 0 5.14 1.4h.01c5.46 0 9.89-4.42 9.89-9.87C21.94 6.42 17.5 2 12.04 2z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.2C7.03 3.2 3 6.42 3 10.4c0 2.52 1.66 4.73 4.16 5.99l-.96 3.55c-.1.37.3.67.62.46l4.2-2.8c.32.03.65.05.98.05 4.97 0 9-3.22 9-7.25S16.97 3.2 12 3.2z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.19 5.4 3.14 7.14V22l3.05-1.67c.9.25 1.85.39 2.81.39 5.64 0 10.2-4.13 10.2-9.02C21.2 6.13 17.64 2 12 2zm1.01 12.16-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.85c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.19 2.12.19v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}
