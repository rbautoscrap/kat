import { PromoQueuePanel } from "@/components/admin/PromoQueuePanel";
import { listPromoQueue } from "@/lib/promo-queue";

export const dynamic = "force-dynamic";

export default async function AdminPromoPage() {
  const rows = await listPromoQueue();
  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <PromoQueuePanel
        rows={rows}
        webhookPath="/api/promo/feed"
        secretConfigured={Boolean(process.env.PROMO_WEBHOOK_SECRET?.trim())}
      />
    </div>
  );
}
