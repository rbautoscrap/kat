"use client";

import { AuthModalShell } from "@/components/AuthModalShell";
import { JoinForm } from "@/components/JoinForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
};

export function JoinModal({ open, onClose, onSwitchToLogin }: Props) {
  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title="Join"
      maxWidthClass="max-w-[24rem]"
      closeLabel="Close join"
    >
      <JoinForm onLoginClick={onSwitchToLogin ?? onClose} />
    </AuthModalShell>
  );
}
