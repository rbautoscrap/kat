"use client";

export function InventoryPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-3.5 text-[13px] font-semibold text-white transition hover:bg-neutral-800"
    >
      PDF로 저장
    </button>
  );
}
