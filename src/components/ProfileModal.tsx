"use client";

import { AuthModalShell } from "@/components/AuthModalShell";
import {
  ProfileForm,
  type ProfileUser,
} from "@/components/profile/ProfileForm";

type Props = {
  open: boolean;
  onClose: () => void;
  user: ProfileUser;
};

export function ProfileModal({ open, onClose, user }: Props) {
  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title="Profile"
      maxWidthClass="max-w-[26rem]"
      closeLabel="Close profile"
      closeOnBackdrop={false}
    >
      <ProfileForm
        key={`${user.name}-${user.email}`}
        user={user}
        compact
        onOffersClick={onClose}
      />
    </AuthModalShell>
  );
}
