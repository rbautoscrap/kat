import Link from "next/link";
import { ContactBar } from "@/components/ContactBar";
import { VisitStats } from "@/components/VisitStats";

export function Footer() {
  return (
    <footer className="mt-auto">
      <ContactBar />
      <div className="border-t border-neutral-800 bg-[var(--banner)] text-neutral-300">
        <div className="site-container flex min-h-[3.25rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-[13px]">
          <VisitStats />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-neutral-400">
              © {new Date().getFullYear()} KOREA AUTO TRADE
            </span>
            <Link href="/about-us" className="hover:text-white">
              About Us
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms of Use
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
