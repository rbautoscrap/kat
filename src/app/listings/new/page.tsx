import { redirect } from "next/navigation";
import { NewListingPageClient } from "@/components/NewListingPageClient";
import { canManageListings, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { parseCategory } from "@/lib/listings";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function NewListingPage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) redirect("/login?callbackUrl=/listings/new");
  if (!canManageListings(dbUser.role)) {
    redirect("/?error=unauthorized");
  }

  const backHref = isAdmin(dbUser.role) ? "/admin/listings" : "/";
  const defaultCategory = parseCategory(params.category ?? null) ?? undefined;

  return (
    <NewListingPageClient
      backHref={backHref}
      defaultCategory={defaultCategory}
    />
  );
}
