import Link from "next/link";
import { canManageListings } from "@/lib/auth";
import { CsResumeBanner } from "@/components/CsResumeBanner";
import { resolveSessionDbUser } from "@/lib/listing-access";

export async function HeroBanner() {
  const dbUser = await resolveSessionDbUser();
  /** Vehicle listers only (ADMIN / AUTHORIZED). Regular members no longer see + List. */
  const canList = canManageListings(dbUser?.role);

  return (
    <div className="border-b border-[var(--line)] bg-neutral-50/60">
      <div className="site-container relative flex flex-col items-center justify-center py-3.5 sm:py-5">
        <CsResumeBanner />
        {canList ? (
          <Link
            href="/listings/new"
            className="mt-2 inline-flex h-9 w-full shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3.5 text-[12.5px] font-medium tracking-wide text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 sm:absolute sm:right-0 sm:top-1/2 sm:mt-0 sm:h-8 sm:w-auto sm:-translate-y-1/2"
          >
            + List
          </Link>
        ) : null}
      </div>
    </div>
  );
}
