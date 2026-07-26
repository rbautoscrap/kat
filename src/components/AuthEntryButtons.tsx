"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";

type Mode = "login" | "join" | null;

type Props = {
  joinClassName?: string;
  loginClassName?: string;
  /** Called when a modal opens (e.g. hide mobile nav panel). */
  onModalOpen?: () => void;
  /** Called when both auth modals are fully closed. */
  onModalClose?: () => void;
};

export function AuthEntryButtons({
  joinClassName,
  loginClassName,
  onModalOpen,
  onModalClose,
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawCallback =
    `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}` ||
    "/";
  const callbackUrl =
    rawCallback.startsWith("/login") || rawCallback.startsWith("/join")
      ? "/"
      : rawCallback;

  const open = useCallback(
    (next: Mode) => {
      setMode(next);
      if (next) onModalOpen?.();
    },
    [onModalOpen],
  );

  const close = useCallback(() => {
    setMode(null);
    onModalClose?.();
  }, [onModalClose]);

  return (
    <>
      <button
        type="button"
        className={joinClassName}
        onClick={() => open("join")}
      >
        Join
      </button>
      <button
        type="button"
        className={loginClassName}
        onClick={() => open("login")}
      >
        Login
      </button>
      <LoginModal
        open={mode === "login"}
        onClose={close}
        callbackUrl={callbackUrl}
        onSwitchToJoin={() => setMode("join")}
      />
      <JoinModal
        open={mode === "join"}
        onClose={close}
        onSwitchToLogin={() => setMode("login")}
      />
    </>
  );
}
