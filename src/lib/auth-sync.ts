export const AUTH_SYNC_KEY = "kat-auth-sync";

export type AuthSyncReason = "login" | "logout";

export function broadcastAuthChange(reason: AuthSyncReason) {
  const payload = JSON.stringify({ reason, at: Date.now() });
  try {
    localStorage.setItem(AUTH_SYNC_KEY, payload);
  } catch {
    /* private mode */
  }
  try {
    const channel = new BroadcastChannel(AUTH_SYNC_KEY);
    channel.postMessage({ reason, at: Date.now() });
    channel.close();
  } catch {
    /* unsupported */
  }
}
