"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ListingCategory } from "@prisma/client";
import { updateListingLinkedMenus } from "@/app/admin/actions";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";
import {
  LINKABLE_MENUS,
  menuCoveredByCategory,
  type LinkableMenu,
} from "@/lib/listing-menus";

const boxClass =
  "inline-flex h-7 items-center gap-1 rounded border px-1.5 text-[11.5px] leading-none";

export function ListingMenuLinkFields({
  category,
  value,
  onChange,
}: {
  category: ListingCategory;
  value: LinkableMenu[];
  onChange: (next: LinkableMenu[]) => void;
}) {
  const extras = LINKABLE_MENUS.filter(
    (menu) => !menuCoveredByCategory(category, menu),
  );
  if (extras.length === 0) return null;

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-[13px] font-medium tracking-wide text-neutral-600">
        추가 노출
      </p>
      <div className="flex flex-wrap gap-1.5">
        {extras.map((menu) => {
          const on = value.includes(menu);
          return (
            <label
              key={menu}
              className={`${boxClass} cursor-pointer ${
                on
                  ? "border-neutral-800 bg-neutral-800 text-white"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              <input
                type="checkbox"
                name="linkedMenus"
                value={menu}
                checked={on}
                onChange={() =>
                  onChange(
                    on ? value.filter((item) => item !== menu) : [...value, menu],
                  )
                }
                className="sr-only"
              />
              {ADMIN_CATEGORY_LABELS[menu]}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ListingMenuLinkToggles({
  listingId,
  category,
  linkedMenus,
}: {
  listingId: string;
  category: ListingCategory;
  linkedMenus?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const extras = LINKABLE_MENUS.filter(
    (menu) => !menuCoveredByCategory(category, menu),
  );
  if (extras.length === 0) return null;

  const selected = extras.filter((menu) =>
    (linkedMenus ?? "").includes(`,${menu},`),
  );

  return (
    <div className="flex flex-wrap gap-1">
      {extras.map((menu) => {
        const on = selected.includes(menu);
        return (
          <button
            key={menu}
            type="button"
            disabled={pending}
            aria-pressed={on}
            className={`${boxClass} ${
              on
                ? "border-neutral-800 bg-neutral-800 text-white"
                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
            }`}
            onClick={() => {
              const next = on
                ? selected.filter((item) => item !== menu)
                : [...selected, menu];
              startTransition(async () => {
                const result = await updateListingLinkedMenus(listingId, next);
                if (!result.ok) alert(result.error);
                else router.refresh();
              });
            }}
          >
            {ADMIN_CATEGORY_LABELS[menu]}
          </button>
        );
      })}
    </div>
  );
}
