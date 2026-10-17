export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { scheduleOrphanUploadPurge } = await import(
    "@/lib/purge-orphan-uploads"
  );
  scheduleOrphanUploadPurge();
}
