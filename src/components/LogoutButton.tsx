"use client";

import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { broadcastAuthChange } from "@/lib/auth-sync";

type Props = {
  className?: string;
  children?: ReactNode;
};

export function LogoutButton({ className, children = "Log out" }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void (async () => {
          await signOut({ redirect: false });
          broadcastAuthChange("logout");
          window.location.assign("/");
        })();
      }}
    >
      {children}
    </button>
  );
}
