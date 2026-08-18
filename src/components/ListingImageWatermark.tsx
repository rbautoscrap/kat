type Props = {
  size?: "card" | "detail" | "lightbox";
};

/**
 * Faint RBAUTO mark on Car Listings photos (cards, gallery, lightbox).
 */
export function ListingImageWatermark({ size = "card" }: Props) {
  const scale =
    size === "lightbox"
      ? "h-[52%] w-[52%] max-h-72 max-w-72"
      : size === "detail"
        ? "h-[68%] w-[68%]"
        : "h-[70%] w-[70%]";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rbauto-logo.png"
        alt=""
        draggable={false}
        className={`select-none object-contain opacity-[0.28] mix-blend-multiply ${scale}`}
      />
    </div>
  );
}
