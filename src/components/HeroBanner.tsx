import Link from "next/link";
import { canManageListings } from "@/lib/auth";
import { CsResumeBanner } from "@/components/CsResumeBanner";
import { nextKoreaNineAm } from "@/lib/format-korea-time";
import { resolveSessionDbUser } from "@/lib/listing-access";

export async function HeroBanner() {
  const dbUser = await resolveSessionDbUser();
  /** Vehicle listers only (ADMIN / AUTHORIZED). Regular members no longer see + List. */
  const canList = canManageListings(dbUser?.role);
  const resumeAt = nextKoreaNineAm().toISOString();

  return (
    <div className="border-b border-[var(--line)] bg-neutral-50/60">
      <div className="site-container flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5">
        <CsResumeBanner resumeAt={resumeAt} />
        {canList ? (
          <Link
            href="/listings/new"
            className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3.5 text-[12.5px] font-medium tracking-wide text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 sm:h-8 sm:w-auto"
          >
            + List
          </Link>
        ) : null}
      </div>
    </div>
  );
}
