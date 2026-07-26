import {
  CONTACT_LINE,
  CONTACT_WHATSAPP,
  kakaoTalkLink,
} from "@/lib/contact";

export function ContactBar() {
  const kakaoHref = kakaoTalkLink();

  return (
    <div className="border-t border-neutral-800 bg-neutral-950">
      <div className="site-container flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-[13.5px] text-neutral-300">
        <span className="min-w-0 break-words leading-snug sm:truncate">
          {CONTACT_LINE}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <a
            href={`https://wa.me/${CONTACT_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#25D366]/15 px-2.5 py-0.5 text-[11.5px] font-medium text-[#6eef9a] transition hover:bg-[#25D366]/25"
          >
            WhatsApp
          </a>
          {kakaoHref ? (
            <a
              href={kakaoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#FEE500]/90 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#191919] transition hover:bg-[#FEE500]"
            >
              KakaoTalk
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
