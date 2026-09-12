"use client";

import { useEffect } from "react";
import { AUTH_SYNC_KEY } from "@/lib/auth-sync";

async function sessionUserId() {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as { user?: { id?: string } };
    return typeof data.user?.id === "string" ? data.user.id : "";
  } catch {
    return null;
  }
}

export function SessionSync() {
  useEffect(() => {
    let cancelled = false;
    let lastId = "";
    let ready = false;

    async function check() {
      const next = await sessionUserId();
      if (cancelled || next == null) return;
      if (!ready) {
        lastId = next;
        ready = true;
        return;
      }
      if (next !== lastId) {
        lastId = next;
        window.location.reload();
      }
    }

    void check();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_SYNC_KEY);
      channel.onmessage = () => {
        void check();
      };
    } catch {
      channel = null;
    }

    function onStorage(event: StorageEvent) {
      if (event.key === AUTH_SYNC_KEY) void check();
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
    };
  }, []);

  return null;
}
