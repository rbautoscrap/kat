import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true },
  });

  if (!user) {
    redirect("/login?callbackUrl=/profile");
  }

  return <ProfilePageClient user={user} />;
}
