"use client";

import type { ListingCategory } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ListingCreateDialog } from "@/components/admin/NewListingModal";

type Props = {
  backHref: string;
  defaultCategory?: ListingCategory;
  defaultSellerName?: string;
};

/** Full-route entry (`/listings/new`) that opens the create modal immediately. */
export function NewListingPageClient({
  backHref,
  defaultCategory,
  defaultSellerName,
}: Props) {
  const router = useRouter();

  return (
    <div className="min-h-[50vh] bg-white" aria-hidden>
      <ListingCreateDialog
        open
        defaultCategory={defaultCategory}
        defaultSellerName={defaultSellerName}
        onClose={() => {
          router.push(backHref);
        }}
      />
    </div>
  );
}
