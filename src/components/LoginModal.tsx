"use client";

import { AuthModalShell } from "@/components/AuthModalShell";
import { LoginForm } from "@/components/LoginForm";

type Props = {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
  defaultId?: string;
  errorMessage?: string | null;
  pending?: boolean;
  registered?: boolean;
  onSwitchToJoin?: () => void;
};

export function LoginModal({
  open,
  onClose,
  callbackUrl = "/",
  defaultId,
  errorMessage,
  pending,
  registered,
  onSwitchToJoin,
}: Props) {
  return (
    <AuthModalShell
      open={open}
      onClose={onClose}
      title="Login"
      maxWidthClass="max-w-[22.5rem]"
      closeLabel="Close login"
    >
      <LoginForm
        compact
        callbackUrl={callbackUrl}
        defaultId={defaultId}
        errorMessage={errorMessage}
        pending={pending}
        registered={registered}
        onJoinClick={onSwitchToJoin ?? onClose}
      />
    </AuthModalShell>
  );
}
