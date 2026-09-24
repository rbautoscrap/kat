"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ListingCategory } from "@prisma/client";
import { updateListingLinkedMenus } from "@/app/admin/actions";
import {
  LINKABLE_MENU_LABELS,
  LINKABLE_MENUS,
  menuCoveredByCategory,
  type LinkableMenu,
} from "@/lib/listing-menus";

const boxClass =
  "inline-flex h-7 items-center rounded border px-2 text-[11.5px] leading-none";

export function ListingMenuLinkFields({
  listingId,
  category,
  value,
  onChange,
}: {
  listingId?: string;
  category: ListingCategory;
  value: LinkableMenu[];
  onChange: (next: LinkableMenu[]) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const extras = LINKABLE_MENUS.filter(
    (menu) => !menuCoveredByCategory(category, menu),
  );
  if (extras.length === 0) return null;

  function apply(next: LinkableMenu[]) {
    onChange(next);
    if (!listingId) return;
    startTransition(async () => {
      const result = await updateListingLinkedMenus(listingId, next);
      if (!result.ok) alert(result.error);
      else router.refresh();
    });
  }

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
              } ${pending ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                name="linkedMenus"
                value={menu}
                checked={on}
                disabled={pending}
                onChange={() =>
                  apply(
                    on ? value.filter((item) => item !== menu) : [...value, menu],
                  )
                }
                className="sr-only"
              />
              {LINKABLE_MENU_LABELS[menu]}
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
    (linkedMenus ?? "").includes(menu),
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
            {LINKABLE_MENU_LABELS[menu]}
          </button>
        );
      })}
    </div>
  );
}
