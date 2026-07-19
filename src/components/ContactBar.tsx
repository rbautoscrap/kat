import { CONTACT_LINE, CONTACT_WHATSAPP } from "@/lib/contact";

export function ContactBar() {
  return (
    <div className="border-t border-neutral-800 bg-neutral-950">
      <div className="site-container flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-[12.5px] tracking-wide text-neutral-300">
        <span className="min-w-0">{CONTACT_LINE}</span>
        <a
          href={`https://wa.me/${CONTACT_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#25D366]/15 px-2.5 py-0.5 text-[11.5px] font-medium text-[#6eef9a] transition hover:bg-[#25D366]/25"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
