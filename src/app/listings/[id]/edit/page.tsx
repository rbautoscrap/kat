import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { ListingForm } from "@/components/ListingForm";
import { requireListingModifier } from "@/lib/listing-access";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const access = await requireListingModifier(id);

  if (!access.ok) {
    if (access.status === 401) {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(`/listings/${id}/edit`)}`,
      );
    }
    if (access.status === 404) notFound();
    redirect("/?error=unauthorized");
  }

  return (
    <div className="site-container py-8" lang="ko">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <BackButton href={`/listings/${access.listing.id}`} label="뒤로" />
        </div>
        <h1 className="site-heading mb-7 text-[1.2rem] text-neutral-800">
          매물 수정
        </h1>
        <ListingForm listing={access.listing} />
      </div>
    </div>
  );
}
