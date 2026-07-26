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
      closeOnBackdrop={false}
      closeButtonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-red-50 hover:text-red-700"
    >
      <JoinForm onLoginClick={onSwitchToLogin ?? onClose} />
    </AuthModalShell>
  );
}
