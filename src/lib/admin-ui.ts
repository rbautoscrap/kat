/** Shared class tokens for admin tables / actions */

/** Horizontal scroll host — keeps tables usable on phones without crushing cells */
export const adminTableScrollClass =
  "admin-table-scroll -mx-px overflow-x-auto overscroll-x-contain";

export const adminTableClass =
  "admin-table w-full min-w-[1100px] border-collapse text-left";

export const adminThClass =
  "border-b border-[var(--line)] bg-neutral-50/90 px-3.5 py-3 text-[12.5px] font-semibold text-neutral-600 whitespace-nowrap";

export const adminTdClass =
  "border-b border-neutral-100 px-3.5 py-3 text-[13.5px] font-medium leading-snug text-neutral-800 align-middle";

/** Actions column: allow wrap, do not clip controls */
export const adminTdActionsClass =
  "border-b border-neutral-100 px-3.5 py-3 text-[13.5px] font-medium leading-snug text-neutral-800 align-middle overflow-visible";

export const adminActionBtnClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white px-2.5 text-[12.5px] font-semibold text-neutral-700 transition hover:bg-neutral-50 whitespace-nowrap";

export const adminDangerBtnClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white px-2.5 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap";

export const adminSelectClass =
  "h-8 max-w-full shrink-0 rounded-md border border-neutral-200 bg-white px-2 text-[12.5px] font-medium text-neutral-700 outline-none focus:border-neutral-400 disabled:opacity-50";

export const adminSectionTitleClass =
  "text-[15px] font-bold tracking-tight text-neutral-900";

export const adminSectionDescClass =
  "mt-1 text-[13px] font-normal leading-relaxed text-neutral-500";
