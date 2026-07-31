import { redirect } from "next/navigation";
import { NewListingPageClient } from "@/components/NewListingPageClient";
import {
  canCreateListing,
  canListUsedParts,
  canManageListings,
  isAdmin,
} from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { CATEGORY_PATHS, parseCategory } from "@/lib/listings";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function NewListingPage({ searchParams }: Props) {
  const params = await searchParams;
  let defaultCategory = parseCategory(params.category ?? null) ?? undefined;
  const newPath = defaultCategory
    ? `/listings/new?category=${defaultCategory}`
    : "/listings/new";

  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    redirect(`/login?callbackUrl=${encodeURIComponent(newPath)}`);
  }

  // Regular members may only open the Used Parts create flow.
  if (!canManageListings(dbUser.role) && canListUsedParts(dbUser.role)) {
    if (defaultCategory && defaultCategory !== "USED_PARTS") {
      redirect("/?error=unauthorized");
    }
    defaultCategory = "USED_PARTS";
  } else if (!canCreateListing(dbUser.role, defaultCategory ?? "CAR_LISTINGS")) {
    redirect("/?error=unauthorized");
  }

  const backHref = defaultCategory
    ? CATEGORY_PATHS[defaultCategory]
    : isAdmin(dbUser.role)
      ? "/admin/listings"
      : "/";

  return (
    <NewListingPageClient
      backHref={backHref}
      defaultCategory={defaultCategory}
      defaultSellerName={dbUser.name}
    />
  );
}
