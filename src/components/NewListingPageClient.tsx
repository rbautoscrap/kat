"use client";

import type { ListingCategory } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ListingCreateDialog } from "@/components/admin/NewListingModal";

type Props = {
  backHref: string;
  defaultCategory?: ListingCategory;
};

/** Full-route entry (`/listings/new`) that opens the create modal immediately. */
export function NewListingPageClient({ backHref, defaultCategory }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-[50vh] bg-white" aria-hidden>
      <ListingCreateDialog
        open
        defaultCategory={defaultCategory}
        onClose={() => {
          router.push(backHref);
        }}
      />
    </div>
  );
}
