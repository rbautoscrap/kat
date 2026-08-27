import { AdminNav } from "@/components/admin/AdminNav";
import { HolidayModeToggle } from "@/components/admin/HolidayModeToggle";
import { requireAdmin } from "@/lib/admin";
import { isPriceInquiryHoliday } from "@/lib/site-settings";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const holidayMode = await isPriceInquiryHoliday();

  return (
    <div className="admin-shell border-b border-[var(--line)] bg-neutral-50/70" lang="ko">
      <div className="site-container py-5 sm:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="admin-eyebrow">관리자</p>
            <h1 className="admin-page-title mt-1">관리 페이지</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HolidayModeToggle enabled={holidayMode} />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-ghost-btn"
            >
              메인 화면
            </a>
          </div>
        </div>
        <AdminNav />
      </div>
      <div className="site-container pb-10 pt-6">{children}</div>
    </div>
  );
}
