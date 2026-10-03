type Props = {
  size?: "card" | "detail";
};

/** Screen-only mark. Stored photo files are unchanged. */
export function PhotoWatermark({ size = "card" }: Props) {
  const detail = size === "detail";

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
    >
      <span
        className={`select-none font-semibold tracking-[0.22em] text-white/20 ${
          detail
            ? "text-[1.7rem] sm:text-[2.4rem]"
            : "text-[0.95rem] sm:text-[1.15rem]"
        }`}
      >
        RBAUTO
      </span>
    </span>
  );
}
