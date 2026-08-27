import { BackupPanel } from "@/components/admin/BackupPanel";
import { HolidayModeToggle } from "@/components/admin/HolidayModeToggle";
import { MonitoringPanel } from "@/components/admin/MonitoringPanel";
import {
  collectMaintenanceSnapshot,
  listBackups,
} from "@/lib/maintenance";
import { isPriceInquiryHoliday } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  const [snapshot, backups, holidayMode] = await Promise.all([
    collectMaintenanceSnapshot(),
    Promise.resolve(listBackups()),
    isPriceInquiryHoliday(),
  ]);

  return (
    <div className="space-y-4">
      <div className="admin-panel px-5 py-4">
        <div className="admin-section-head">
          <div className="admin-section-head-text">
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              유지보수
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              서비스 상태를 확인하고, 데이터베이스·이미지를 백업합니다.
            </p>
          </div>
        </div>
      </div>

      <section
        className={`admin-panel overflow-hidden ${
          holidayMode ? "border-amber-300 bg-amber-50/70" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              휴일 모드
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              켜 두면 매물 상세의 Price Check Only가 Documents / CS 번호로
              연결됩니다. 쉬는 날 켜고, 다시 받을 때 끄세요.
            </p>
            <p
              className={`mt-2 text-[13px] font-semibold ${
                holidayMode ? "text-amber-800" : "text-neutral-700"
              }`}
            >
              현재: {holidayMode ? "켜짐 · CS 번호로 연결 중" : "꺼짐 · 가격 전용 번호"}
            </p>
          </div>
          <HolidayModeToggle enabled={holidayMode} />
        </div>
      </section>

      <MonitoringPanel snapshot={snapshot} />
      <BackupPanel initialBackups={backups} />
    </div>
  );
}
