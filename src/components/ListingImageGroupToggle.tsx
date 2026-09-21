"use client";

import {
  LISTING_IMAGE_GROUPS,
  type ListingImageGroup,
} from "@/lib/listing-images";

type Props = {
  value: ListingImageGroup;
  onChange: (group: ListingImageGroup) => void;
  /** Groups that have photos. Empty = show both. */
  available?: ListingImageGroup[];
  disabled?: Partial<Record<ListingImageGroup, boolean>>;
  size?: "sm" | "md";
  className?: string;
  /** Always render 1 and 2 (admin form). */
  showEmpty?: boolean;
  labels?: Partial<Record<ListingImageGroup, string>>;
};

function PhotoSetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="7.5"
        y="3.5"
        width="13"
        height="10.5"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="3.5"
        y="8.5"
        width="13"
        height="11.5"
        rx="1.6"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ListingImageGroupToggle({
  value,
  onChange,
  available,
  disabled,
  size = "md",
  className = "",
  showEmpty = false,
  labels,
}: Props) {
  const ready = new Set(
    available && available.length > 0 ? available : LISTING_IMAGE_GROUPS,
  );
  const groups = showEmpty
    ? [...LISTING_IMAGE_GROUPS]
    : LISTING_IMAGE_GROUPS.filter((group) => ready.has(group));

  if (groups.length < 2 && !showEmpty) return null;

  const compact = size === "sm";

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="group"
      aria-label="Photo set"
    >
      {groups.map((group) => {
        const selected = value === group;
        const isDisabled = Boolean(disabled?.[group]) || (!showEmpty && !ready.has(group));
        const label = labels?.[group] ?? `${group}`;
        return (
          <button
            key={group}
            type="button"
            disabled={isDisabled}
            title={
              group === 1
                ? "1그룹 대표·상세 사진"
                : "2그룹 대표·상세 사진"
            }
            aria-pressed={selected}
            aria-label={`${group}그룹 사진`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!isDisabled) onChange(group);
            }}
            className={`inline-flex items-center justify-center rounded-full border font-semibold tracking-wide transition ${
              compact
                ? "h-7 w-7 px-0 text-[12px]"
                : "h-10 gap-1.5 border-neutral-300 px-2.5 text-[13px] shadow-none"
            } ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                : compact
                  ? "border-white/80 bg-white/90 text-neutral-800 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  : "bg-white text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            {compact ? null : (
              <PhotoSetIcon className="h-3.5 w-3.5" />
            )}
            <span>{compact ? group : label}</span>
          </button>
        );
      })}
    </div>
  );
}
