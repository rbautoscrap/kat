"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const NOTICE_ID = "holiday-2026-08-17";
const STORAGE_KEY = `kat-notice:${NOTICE_ID}`;
/** 2026-08-18 09:00 KST = 2026-08-18 00:00 UTC */
const RESUME_AT_MS = Date.UTC(2026, 7, 18, 0, 0, 0);

function shouldShowNotice() {
  if (Date.now() >= RESUME_AT_MS) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function HolidayNoticeDialog() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const dontShowAgainRef = useRef(false);
  const checkboxId = useId();

  useEffect(() => {
    setMounted(true);
    setOpen(shouldShowNotice());
  }, []);

  useEffect(() => {
    dontShowAgainRef.current = dontShowAgain;
  }, [dontShowAgain]);

  function close() {
    if (dontShowAgainRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* private mode */
      }
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[105]">
      <div
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
        aria-hidden
        onClick={close}
      />
      <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="holiday-notice-title"
          className="relative w-full max-w-[24.5rem] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="h-1 bg-[var(--accent)]" />
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
              Notice
            </p>
            <h2
              id="holiday-notice-title"
              className="mt-1.5 text-[17px] font-semibold tracking-tight text-neutral-900"
            >
              휴무 안내
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-600">
              한국 시간 기준 <strong className="font-semibold text-neutral-800">8월 17일</strong>은
              휴일입니다.
              <br />
              업무 및 상담은{" "}
              <strong className="font-semibold text-neutral-800">
                8월 18일 오전 9시(KST)
              </strong>
              부터 재개됩니다.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
              August 17 is a public holiday in Korea (KST).
              <br />
              Business and consultations resume at 9:00 AM on August 18 (KST).
            </p>

            <label
              htmlFor={checkboxId}
              className="mt-5 flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-600"
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 accent-neutral-900"
              />
              다시 보지 않기
            </label>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                autoFocus
                onClick={close}
                className="inline-flex h-9 min-w-[5rem] items-center justify-center rounded-md bg-neutral-900 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
