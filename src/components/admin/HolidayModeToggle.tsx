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
      className={`inline-flex h-10 min-w-[9.5rem] items-center justify-center rounded-md border px-4 text-[13.5px] font-semibold transition disabled:opacity-50 ${
        enabled
          ? "border-amber-400 bg-amber-500 text-white hover:bg-amber-600"
          : "border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800"
      }`}
    >
      {pending
        ? "저장 중…"
        : enabled
          ? "휴일 모드 끄기"
          : "휴일 모드 켜기"}
    </button>
  );
}
