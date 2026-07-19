/** Shared class tokens for admin tables / actions */

/** Horizontal scroll host — keeps tables usable on phones without crushing cells */
export const adminTableScrollClass =
  "admin-table-scroll -mx-px overflow-x-auto overscroll-x-contain";

export const adminTableClass =
  "admin-table w-full min-w-[1100px] border-collapse text-left";

export const adminThClass =
  "border-b border-[var(--line)] bg-neutral-50 px-2.5 py-2.5 text-[12px] font-medium tracking-wide text-neutral-500 whitespace-nowrap sm:px-3 sm:py-3 sm:text-[12.5px]";

export const adminTdClass =
  "border-b border-neutral-100 px-2.5 py-2.5 text-[13px] leading-normal tracking-wide text-neutral-700 align-middle sm:px-3 sm:py-3 sm:text-[13.5px]";

/** Actions column: allow wrap, do not clip controls */
export const adminTdActionsClass =
  "border-b border-neutral-100 px-2.5 py-2.5 text-[13px] leading-normal tracking-wide text-neutral-700 align-middle overflow-visible sm:px-3 sm:py-3 sm:text-[13.5px]";

export const adminActionBtnClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white px-2.5 text-[12.5px] font-medium tracking-wide text-neutral-700 transition hover:bg-neutral-50 whitespace-nowrap";

export const adminDangerBtnClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-2.5 text-[12.5px] font-medium tracking-wide text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap";

export const adminSelectClass =
  "h-8 max-w-full shrink-0 rounded-md border border-neutral-200 bg-white px-1.5 text-[12.5px] tracking-wide text-neutral-700 outline-none focus:border-neutral-400 disabled:opacity-50 sm:px-2";
