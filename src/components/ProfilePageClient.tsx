"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ProfileModal } from "@/components/ProfileModal";
import type { ProfileUser } from "@/components/profile/ProfileForm";

type Props = {
  user: ProfileUser;
};

export function ProfilePageClient({ user }: Props) {
  const router = useRouter();
  const onClose = useCallback(() => {
    router.push("/");
  }, [router]);

  return <ProfileModal open onClose={onClose} user={user} />;
}
