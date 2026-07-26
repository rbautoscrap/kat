"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";

export default function JoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "login">("join");

  const onClose = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <>
      <JoinModal
        open={mode === "join"}
        onClose={onClose}
        onSwitchToLogin={() => setMode("login")}
      />
      <LoginModal
        open={mode === "login"}
        onClose={onClose}
        callbackUrl="/"
        onSwitchToJoin={() => setMode("join")}
      />
    </>
  );
}
