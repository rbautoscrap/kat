"use client";

import { useFormStatus } from "react-dom";
import { togglePriceInquiryHoliday } from "@/app/admin/holiday-actions";

type Props = {
  enabled: boolean;
};

export function HolidayModeToggle({ enabled }: Props) {
  return (
    <form action={togglePriceInquiryHoliday} className="flex items-center">
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <ToggleButton enabled={enabled} />
    </form>
  );
}

function ToggleButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[12.5px] font-semibold transition disabled:opacity-50 ${
        enabled
          ? "border-amber-400 bg-amber-500 text-white hover:bg-amber-600"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
      }`}
      title={
        enabled
          ? "휴일 모드를 끄면 가격 문의가 다시 가격 전용 번호로 연결됩니다."
          : "휴일 모드를 켜면 Price Check Only가 Documents / CS 번호로 연결됩니다."
      }
    >
      {pending
        ? "저장 중…"
        : enabled
          ? "휴일 모드 ON"
          : "휴일 모드"}
    </button>
  );
}
