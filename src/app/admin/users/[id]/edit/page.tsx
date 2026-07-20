import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditUserPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
  });
  if (!user) notFound();

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-neutral-800">회원 수정</h2>
            <p className="mt-1 text-xs text-neutral-500">
              가입일 {user.createdAt.toISOString().slice(0, 10)} · 매물{" "}
              {user._count.listings}개
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-[13px] text-neutral-500 underline hover:text-neutral-800"
          >
            목록으로
          </Link>
        </div>
      </div>
      <div className="px-4 py-6">
        <AdminUserForm user={user} />
      </div>
    </div>
  );
}
