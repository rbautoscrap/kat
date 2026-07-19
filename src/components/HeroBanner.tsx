import Link from "next/link";
import { canManageListings } from "@/lib/auth";
import { CONTACT_LINE } from "@/lib/contact";
import { resolveSessionDbUser } from "@/lib/listing-access";

export async function HeroBanner() {
  const dbUser = await resolveSessionDbUser();
  const canList = canManageListings(dbUser?.role);

  return (
    <div className="border-b border-[var(--line)] bg-neutral-50/60">
      <div className="site-container flex items-center justify-between gap-4 py-4 sm:py-5">
        <div className="min-w-0">
          <p className="text-[12.5px] tracking-wide text-neutral-500">
            {CONTACT_LINE}
          </p>
        </div>
        {canList && (
          <Link
            href="/listings/new"
            className="inline-flex h-8 shrink-0 items-center rounded-md border border-neutral-300 bg-white px-3.5 text-[12.5px] font-medium tracking-wide text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            + List
          </Link>
        )}
      </div>
    </div>
  );
}
