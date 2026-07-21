import { BackupPanel } from "@/components/admin/BackupPanel";
import { MonitoringPanel } from "@/components/admin/MonitoringPanel";
import {
  collectMaintenanceSnapshot,
  listBackups,
} from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  const [snapshot, backups] = await Promise.all([
    collectMaintenanceSnapshot(),
    Promise.resolve(listBackups()),
  ]);

  return (
    <div className="space-y-6">
      <div className="admin-panel px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
          유지보수
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
          서비스 상태를 확인하고, 데이터베이스·이미지를 백업합니다.
        </p>
      </div>

      <MonitoringPanel snapshot={snapshot} />
      <BackupPanel initialBackups={backups} />
    </div>
  );
}
