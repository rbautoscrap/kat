type Props = {
  size?: "card" | "detail" | "lightbox";
};

/**
 * Faint RBAUTO mark on Car Listings photos (cards, gallery, lightbox).
 */
export function ListingImageWatermark({ size = "card" }: Props) {
  const scale =
    size === "lightbox"
      ? "h-[78%] w-[78%] max-h-[28rem] max-w-[28rem]"
      : size === "detail"
        ? "h-[88%] w-[88%]"
        : "h-[90%] w-[90%]";

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
        className={`select-none object-contain opacity-[0.14] mix-blend-multiply ${scale}`}
      />
    </div>
  );
}
