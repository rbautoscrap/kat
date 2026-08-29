"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";
import { normalizeLoginId } from "@/lib/login-id";
import { loginErrorMessage } from "@/lib/login-messages";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "join">("login");

  const callbackUrl = params.get("callbackUrl") || "/";
  const defaultId = params.get("id")
    ? normalizeLoginId(params.get("id")!)
    : "";
  const errorMessage = loginErrorMessage(params.get("error"));
  const pending = params.get("pending") === "1";
  const registered = params.get("registered") === "1";

  const safeCallback = useMemo(() => {
    if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) return "/";
    if (callbackUrl.startsWith("/login")) return "/";
    return callbackUrl;
  }, [callbackUrl]);

  const onClose = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <>
      <LoginModal
        open={mode === "login"}
        onClose={onClose}
        callbackUrl={safeCallback}
        defaultId={defaultId}
        errorMessage={errorMessage}
        pending={pending}
        registered={registered}
        onSwitchToJoin={() => setMode("join")}
      />
      <JoinModal
        open={mode === "join"}
        onClose={onClose}
        onSwitchToLogin={() => setMode("login")}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/20" />
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
