import { BackButton } from "@/components/BackButton";

export default function ListingNotFound() {
  return (
    <div className="site-container py-10" lang="en">
      <div className="mb-4">
        <BackButton href="/" />
      </div>
      <div className="mx-auto max-w-lg rounded-sm border border-[var(--line)] bg-white px-6 py-10 text-center">
        <p className="text-[1.1rem] font-medium tracking-[0.14em] uppercase text-neutral-700">
          Listing removed
        </p>
        <p className="mt-3 text-[14px] leading-relaxed tracking-wide text-neutral-500">
          This listing is no longer available. It may have been sold or deleted.
        </p>
      </div>
    </div>
  );
}
