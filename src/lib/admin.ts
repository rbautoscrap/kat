import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    redirect("/?error=forbidden");
  }
  return session;
}
