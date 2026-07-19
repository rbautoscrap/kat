import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ListingForm } from "@/components/ListingForm";
import { canManageListings, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";

export default async function NewListingPage() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) redirect("/login?callbackUrl=/listings/new");
  if (!canManageListings(dbUser.role)) {
    redirect("/?error=unauthorized");
  }

  const backHref = isAdmin(dbUser.role) ? "/admin/listings" : "/";

  return (
    <div className="site-container py-8" lang="ko">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <BackButton href={backHref} label="뒤로" />
        </div>
        <h1 className="site-heading mb-3 text-[1.2rem] text-neutral-800">
          매물 등록
        </h1>
        <p className="mb-7 text-[13.5px] leading-relaxed tracking-wide text-neutral-500">
          핫딜, 차량 매물, 스탠바이 카테고리에 차량을 등록할 수 있습니다.
        </p>
        <ListingForm />
      </div>
    </div>
  );
}
