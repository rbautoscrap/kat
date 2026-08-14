import type { ListingSaleStatus } from "@prisma/client";

type Props = {
  status: ListingSaleStatus;
  /** Slightly larger ribbon for detail galleries */
  size?: "card" | "detail";
};

/**
 * Top-left vertical ribbon on listing photos (Sold / Reserved).
 */
export function SaleStatusOverlay({ status, size = "card" }: Props) {
  if (status !== "RESERVED" && status !== "SOLD") return null;

  const sold = status === "SOLD";
  const lines = sold ? (["SOLD", "OUT"] as const) : (["RESER", "VED"] as const);

  return (
    <div
      className={`pointer-events-none absolute left-0 top-0 z-[1] flex flex-col items-center justify-center font-extrabold uppercase leading-[1.05] tracking-[0.04em] text-white ${
        sold ? "bg-red-600" : "bg-sky-600"
      } ${
        size === "detail"
          ? "min-w-[2.4rem] px-1 py-2 text-[11px] sm:min-w-[2.85rem] sm:py-2.5 sm:text-[13px]"
          : "min-w-[1.65rem] px-0.5 py-1.5 text-[8px] sm:min-w-[1.9rem] sm:text-[9px]"
      }`}
      aria-hidden
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}
