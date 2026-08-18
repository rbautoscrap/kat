type Props = {
  size?: "card" | "detail" | "lightbox";
};

/**
 * Faint RBAUTO mark on Car Listings photos (cards, gallery, lightbox).
 */
export function ListingImageWatermark({ size = "card" }: Props) {
  const scale =
    size === "lightbox"
      ? "h-[92%] w-[92%] max-h-none max-w-none"
      : size === "detail"
        ? "h-[98%] w-[98%]"
        : "h-full w-full";

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
        className={`select-none object-contain opacity-[0.09] mix-blend-multiply ${scale}`}
      />
    </div>
  );
}
