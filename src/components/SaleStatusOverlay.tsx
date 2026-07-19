import type { ListingSaleStatus } from "@prisma/client";
import { SALE_STATUS_LABELS } from "@/lib/listings";

type Props = {
  status: ListingSaleStatus;
  /** Slightly larger type for detail galleries */
  size?: "card" | "detail";
};

/** Faded English stamp over listing images for Reserved / Sold out. */
export function SaleStatusOverlay({ status, size = "card" }: Props) {
  if (status !== "RESERVED" && status !== "SOLD") return null;

  const label = SALE_STATUS_LABELS[status];
  const sold = status === "SOLD";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/35"
      aria-hidden
    >
      <span
        className={`select-none font-semibold tracking-[0.18em] uppercase text-white/80 ${
          size === "detail"
            ? "text-[1.35rem] sm:text-[1.75rem]"
            : "text-[0.95rem] sm:text-[1.05rem]"
        } ${sold ? "opacity-90" : "opacity-85"}`}
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
      >
        {label}
      </span>
    </div>
  );
}
