import { PromoQueuePanel } from "@/components/admin/PromoQueuePanel";
import { listPromoQueue } from "@/lib/promo-queue";

export const dynamic = "force-dynamic";

export default async function AdminPromoPage() {
  let rows: Awaited<ReturnType<typeof listPromoQueue>> = [];
  try {
    rows = await listPromoQueue();
  } catch {
    rows = [];
  }
  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <PromoQueuePanel
        rows={rows}
        webhookPath="/api/promo/feed"
        secretConfigured={Boolean(process.env.PROMO_WEBHOOK_SECRET?.trim())}
        telegramConfigured={Boolean(
          process.env.TELEGRAM_BOT_TOKEN?.trim() &&
            process.env.TELEGRAM_CHAT_ID?.trim(),
        )}
      />
    </div>
  );
}
