import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ProfileForm } from "@/components/profile/ProfileForm";
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

  return (
    <div className="site-container py-10" lang="en">
      <div className="mx-auto w-full min-w-0 max-w-2xl">
        <div className="mb-4">
          <BackButton href="/" />
        </div>
        <h1 className="text-[1.15rem] font-medium tracking-wide text-neutral-800">
          Profile
        </h1>
        <p className="mt-1.5 mb-5 text-[13px] leading-relaxed tracking-wide text-neutral-500">
          Update your name, login ID, or password.
        </p>
        <ProfileForm user={user} key={`${user.name}-${user.email}`} />
      </div>
    </div>
  );
}
