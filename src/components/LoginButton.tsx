"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginModal } from "@/components/LoginModal";

type Props = {
  className?: string;
  children?: React.ReactNode;
  /** Optional fixed return URL (defaults to current page). */
  callbackUrl?: string;
  onOpenChange?: (open: boolean) => void;
};

export function LoginButton({
  className,
  children = "Login",
  callbackUrl: callbackUrlProp,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const callbackUrl =
    callbackUrlProp ||
    `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}` ||
    "/";

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
        onClick={() => setOpenSafe(true)}
      >
        {children}
      </button>
      <LoginModal
        open={open}
        onClose={() => setOpenSafe(false)}
        callbackUrl={callbackUrl === "/login" ? "/" : callbackUrl}
      />
    </>
  );
}
