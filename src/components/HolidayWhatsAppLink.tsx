"use client";

import { useState, type ReactNode } from "react";
import { AuthModalShell } from "@/components/AuthModalShell";
import {
  HOLIDAY_NOTICE_COPY,
  HOLIDAY_NOTICE_LANGS,
  isHolidayNoticeActive,
  type HolidayNoticeLang,
} from "@/lib/holiday-notice";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
};

export function HolidayWhatsAppLink({
  href,
  className,
  children,
  title,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<HolidayNoticeLang>("en");

  if (!href) return null;

  if (!isHolidayNoticeActive()) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  const copy = HOLIDAY_NOTICE_COPY[lang];

  function goWhatsApp() {
    setOpen(false);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          setLang("en");
          setOpen(true);
        }}
      >
        {children}
      </a>
      <AuthModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Holiday notice"
        maxWidthClass="max-w-[22.5rem]"
      >
        <div className="px-4 pb-4 pt-0.5 sm:px-5 sm:pb-5">
          <div className="flex flex-wrap gap-1">
            {HOLIDAY_NOTICE_LANGS.map((code) => {
              const selected = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`inline-flex h-8 min-w-[4.4rem] flex-1 items-center justify-center rounded-md px-1.5 text-[11px] font-medium leading-none tracking-wide ${
                    selected
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80"
                  }`}
                >
                  {HOLIDAY_NOTICE_COPY[code].label}
                </button>
              );
            })}
          </div>
          <p
            dir={copy.dir}
            lang={lang}
            className="mt-3.5 text-[13.5px] leading-[1.65] tracking-wide text-neutral-700"
          >
            {copy.body}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={goWhatsApp}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#25D366] text-[13px] font-semibold text-white hover:bg-[#1ebe57]"
            >
              {copy.continue}
            </button>
          </div>
        </div>
      </AuthModalShell>
    </>
  );
}
