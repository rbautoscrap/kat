import Link from "next/link";
import { Suspense } from "react";
import { canManageListings, isAdmin, signOut } from "@/lib/auth";
import { MainNav } from "@/components/MainNav";
import { MobileNav } from "@/components/MobileNav";
import { resolveSessionDbUser } from "@/lib/listing-access";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function Header() {
  const dbUser = await resolveSessionDbUser();
  const canList = canManageListings(dbUser?.role);
  const admin = isAdmin(dbUser?.role);

  const accountLinkClass =
    "inline-flex h-8 items-center rounded-md px-2.5 text-[13.5px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900";

  const mobileUser = dbUser
    ? { name: dbUser.name, canList, admin }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
      <div className="site-container">
        {/* Mobile: brand + menu button only */}
        <div className="flex h-14 items-center justify-between gap-3 md:hidden">
          <Link
            href="/"
            className="site-title min-w-0 truncate text-[1.05rem] text-neutral-900"
          >
            KOREA AUTO TRADE
          </Link>
          <Suspense fallback={<div className="h-10 w-10" aria-hidden />}>
            <MobileNav user={mobileUser} logoutAction={logoutAction} />
          </Suspense>
        </div>

        {/* Desktop */}
        <div className="hidden h-16 grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-6 md:grid">
          <Link
            href="/"
            className="site-title shrink-0 whitespace-nowrap text-[1.1rem] text-neutral-900 transition-opacity duration-200 hover:opacity-70"
          >
            KOREA AUTO TRADE
          </Link>

          <Suspense fallback={<div className="min-h-8" aria-hidden />}>
            <MainNav />
          </Suspense>

          <div className="flex shrink-0 items-center justify-end gap-1">
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
                  className={`${accountLinkClass} max-w-[8rem] truncate`}
                  title={dbUser.name}
                >
                  {dbUser.name}
                </Link>
                <form action={logoutAction}>
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
