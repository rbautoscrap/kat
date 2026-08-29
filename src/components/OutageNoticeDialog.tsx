"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const NOTICE_ID = "railway-outage-2026-08-29";
const STORAGE_KEY = `kat-notice:${NOTICE_ID}`;
/** Hide automatically after 2026-08-30 18:00 KST (09:00 UTC). */
const EXPIRE_AT_MS = Date.UTC(2026, 7, 30, 9, 0, 0);

function shouldShowNotice() {
  if (Date.now() >= EXPIRE_AT_MS) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function OutageNoticeDialog() {
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
          aria-labelledby="outage-notice-title"
          className="relative w-full max-w-[24.5rem] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="h-1 bg-amber-500" />
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-700 uppercase">
              Notice
            </p>
            <h2
              id="outage-notice-title"
              className="mt-1.5 text-[17px] font-semibold tracking-tight text-neutral-900"
            >
              서비스 일시 지연 안내
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-600">
              호스팅사(Railway) 서버 장애로 사이트 접속이 느려지거나 잠시 멈출
              수 있습니다.
              <br />
              복구 예정 시각은 아직 공개되지 않았습니다. 복구되는 대로 정상
              이용하실 수 있습니다.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
              Due to a Railway hosting outage, the site may be slow or
              temporarily unavailable.
              <br />
              No recovery time has been announced yet. Service will return to
              normal once the provider restores it.
            </p>

            <label
              htmlFor={checkboxId}
              className="mt-5 flex cursor-pointer items-start gap-2.5 text-[13px] text-neutral-600"
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-neutral-300 text-neutral-900 accent-neutral-900"
              />
              <span className="leading-snug">
                다시 보지 않기
                <span className="mt-0.5 block text-[12.5px] text-neutral-500">
                  Don&apos;t show again
                </span>
              </span>
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
