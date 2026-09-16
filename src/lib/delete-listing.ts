import { toApiErrorMessage } from "@/lib/api-error";
import { revalidateListingSurfaces } from "@/lib/home-listings";
import { deleteUploadedFiles } from "@/lib/listing-actions";
import { prisma } from "@/lib/prisma";

/**
 * Hard-delete a listing and detach statement/invoice snapshots.
 * Photo files are best-effort: a volume unlink failure must not roll back
 * the DB delete or leave the home page showing a ghost card.
 */
export async function deleteListingById(listingId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const id = listingId.trim();
  if (!id) return { ok: false, error: "매물을 찾을 수 없습니다." };

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      images: { select: { url: true } },
    },
  });
  if (!listing) return { ok: false, error: "매물을 찾을 수 없습니다." };

  const urls = listing.images.map((img) => img.url);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transactionStatementItem.updateMany({
        where: { listingId: id },
        data: { listingId: null },
      });
      await tx.overseasInvoiceItem.updateMany({
        where: { listingId: id },
        data: { listingId: null },
      });
      await tx.transactionStatement.updateMany({
        where: { listingId: id },
        data: { listingId: null },
      });
      await tx.purchaseOffer.deleteMany({ where: { listingId: id } });
      await tx.listingView.deleteMany({ where: { listingId: id } });
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      await tx.listing.delete({ where: { id } });
    });
  } catch (error) {
    try {
      await prisma.listing.delete({ where: { id } });
    } catch (fallbackError) {
      const stillThere = await prisma.listing.findUnique({
        where: { id },
        select: { id: true },
      });
      if (stillThere) {
        return {
          ok: false,
          error: toApiErrorMessage(fallbackError, "매물 삭제에 실패했습니다."),
        };
      }
      console.error("[deleteListingById] fallback delete", error, fallbackError);
    }
  }

  try {
    await deleteUploadedFiles(urls);
  } catch (error) {
    console.error("[deleteListingById] file cleanup", error);
  }

  revalidateListingSurfaces(id);
  return { ok: true };
}
