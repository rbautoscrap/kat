type Props = {
  priceHref: string | null;
  csHref: string | null;
  holidayMode?: boolean;
};

export function ListingContactLinks({
  priceHref,
  csHref,
  holidayMode = false,
}: Props) {
  if (!priceHref && !csHref) {
    return (
      <p className="text-[12px] leading-snug tracking-wide text-neutral-500">
        Contact unavailable
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {priceHref ? (
          <a
            href={priceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-1 rounded bg-[#1877F2] px-2 py-1.5 text-[12px] font-semibold tracking-wide text-white transition hover:brightness-95"
          >
            <WhatsAppIcon />
            Price Check Only
          </a>
        ) : null}
        {csHref ? (
          <a
            href={csHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-1 rounded bg-[#25D366] px-2 py-1.5 text-[12px] font-semibold tracking-wide text-white transition hover:brightness-95"
          >
            <WhatsAppIcon />
            Documents / CS
          </a>
        ) : null}
      </div>
      <p className="text-center text-[10.5px] leading-snug tracking-wide text-neutral-500 sm:text-left">
        {holidayMode
          ? "Holiday: Price Check Only connects to Documents / CS"
          : "Blue: vehicle price only · Green: documents, statement, customs"}
      </p>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.3c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.45-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
      <path d="M12.04 2C6.58 2 2.15 6.42 2.15 11.87c0 1.9.5 3.75 1.45 5.38L2 22l4.9-1.28a9.86 9.86 0 0 0 5.14 1.4h.01c5.46 0 9.89-4.42 9.89-9.87C21.94 6.42 17.5 2 12.04 2zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.18 8.18 0 0 1-1.26-4.35c0-4.53 3.7-8.21 8.22-8.21 4.52 0 8.21 3.68 8.21 8.21 0 4.53-3.69 8.19-8.22 8.19z" />
    </svg>
  );
}
