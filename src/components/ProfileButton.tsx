"use client";

import { useCallback, useState } from "react";
import type { Role } from "@prisma/client";
import { ProfileModal } from "@/components/ProfileModal";

type Props = {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  className?: string;
  title?: string;
  onOpenChange?: (open: boolean) => void;
};

export function ProfileButton({
  user,
  className,
  title,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const setOpenSafe = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  return (
    <>
      <button
        type="button"
        className={className}
        title={title ?? user.name}
        onClick={() => setOpenSafe(true)}
      >
        {user.name}
      </button>
      <ProfileModal
        open={open}
        onClose={() => setOpenSafe(false)}
        user={user}
      />
    </>
  );
}
