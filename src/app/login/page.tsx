"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { LoginModal } from "@/components/LoginModal";
import { normalizeLoginId } from "@/lib/login-id";
import { loginErrorMessage } from "@/lib/login-messages";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const callbackUrl = params.get("callbackUrl") || "/";
  const defaultId = params.get("id")
    ? normalizeLoginId(params.get("id")!)
    : "";
  const errorMessage = loginErrorMessage(params.get("error"));
  const pending = params.get("pending") === "1";
  const registered = params.get("registered") === "1";

  const safeCallback = useMemo(() => {
    if (!callbackUrl || callbackUrl.startsWith("/login")) return "/";
    return callbackUrl;
  }, [callbackUrl]);

  const onClose = useCallback(() => {
    router.push(safeCallback === "/" ? "/" : safeCallback);
  }, [router, safeCallback]);

  return (
    <LoginModal
      open
      onClose={onClose}
      callbackUrl={safeCallback}
      defaultId={defaultId}
      errorMessage={errorMessage}
      pending={pending}
      registered={registered}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/20">
          <div className="h-10 w-40 animate-pulse rounded-md bg-white/80" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
