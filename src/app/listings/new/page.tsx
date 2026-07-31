import { redirect } from "next/navigation";
import { NewListingPageClient } from "@/components/NewListingPageClient";
import { canManageListings, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { CATEGORY_PATHS, parseCategory } from "@/lib/listings";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function NewListingPage({ searchParams }: Props) {
  const params = await searchParams;
  const defaultCategory = parseCategory(params.category ?? null) ?? undefined;
  const newPath = defaultCategory
    ? `/listings/new?category=${defaultCategory}`
    : "/listings/new";

  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    redirect(`/login?callbackUrl=${encodeURIComponent(newPath)}`);
  }
  if (!canManageListings(dbUser.role)) {
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
    />
  );
}
