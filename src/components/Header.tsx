import Link from "next/link";
import { Suspense } from "react";
import { canManageListings, isAdmin, signOut } from "@/lib/auth";
import { MainNav } from "@/components/MainNav";
import { resolveSessionDbUser } from "@/lib/listing-access";

export async function Header() {
  const dbUser = await resolveSessionDbUser();
  const canList = canManageListings(dbUser?.role);
  const admin = isAdmin(dbUser?.role);

  const accountLinkClass =
    "inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium tracking-wide text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
      <div className="site-container">
        <div className="grid h-14 grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-2 sm:h-16 sm:gap-6">
          <Link
            href="/"
            className="site-title min-w-0 max-w-[9.5rem] shrink truncate whitespace-nowrap text-[0.82rem] text-neutral-900 transition-opacity duration-200 hover:opacity-70 sm:max-w-none sm:text-[1rem]"
          >
            KOREA AUTO TRADE
          </Link>

          <Suspense
            fallback={
              <div className="hidden min-h-8 md:block" aria-hidden />
            }
          >
            <MainNav />
          </Suspense>

          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            {dbUser ? (
              <>
                {canList && (
                  <Link href="/listings/new" className={accountLinkClass}>
                    + List
                  </Link>
                )}
                {admin && (
                  <Link href="/admin" className={accountLinkClass}>
                    관리자
                  </Link>
                )}
                <Link
                  href="/profile"
                  className={`${accountLinkClass} max-w-[6.5rem] truncate sm:max-w-[8rem]`}
                  title={dbUser.name}
                >
                  {dbUser.name}
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className={accountLinkClass}>
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/join" className={accountLinkClass}>
                  Join
                </Link>
                <Link
                  href="/login"
                  className="ml-1 inline-flex h-8 items-center rounded-md bg-neutral-900 px-3 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
