import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div
      className="border-b border-[var(--line)] bg-neutral-50/70"
      lang="ko"
    >
      <div className="site-container py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.08em] text-neutral-400">
              관리자
            </p>
            <h1 className="site-heading mt-0.5 text-[1.15rem] text-neutral-800">
              관리 페이지
            </h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-[13px] tracking-wide text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            메인 화면
          </a>
        </div>
        <AdminNav />
      </div>
      <div className="site-container pb-8 pt-6">{children}</div>
    </div>
  );
}
