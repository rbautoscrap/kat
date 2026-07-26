import { redirect } from "next/navigation";
import { NewListingPageClient } from "@/components/NewListingPageClient";
import { canManageListings, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";

export default async function NewListingPage() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) redirect("/login?callbackUrl=/listings/new");
  if (!canManageListings(dbUser.role)) {
    redirect("/?error=unauthorized");
  }

  const backHref = isAdmin(dbUser.role) ? "/admin/listings" : "/";

  return <NewListingPageClient backHref={backHref} />;
}
