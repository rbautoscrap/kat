import { BackButton } from "@/components/BackButton";
import { CONTACT_LINE, CONTACT_PHONE, CONTACT_WHATSAPP } from "@/lib/contact";

const pillars = [
  {
    title: "Curated inventory",
    body: "HOT DEALS, Car Listings, and Stand by — clear categories so buyers can find the right vehicle quickly.",
  },
  {
    title: "Transparent process",
    body: "Specs, notes, and photos are listed upfront. Pricing and next steps are confirmed directly via WhatsApp or KakaoTalk.",
  },
  {
    title: "Export-ready support",
    body: "We help with invoices, payments, and shipment coordination so overseas buyers can move from inquiry to delivery with confidence.",
  },
];

export default function AboutUsPage() {
  return (
    <div lang="en">
      <div className="site-container py-10 sm:py-12">
        <div className="mb-4">
          <BackButton href="/" />
        </div>

        <header className="mb-8 max-w-2xl sm:mb-10">
          <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            Company
          </p>
          <h1 className="site-heading mt-1.5 text-[1.6rem] text-neutral-800 sm:text-[1.85rem]">
            About Us
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed tracking-wide text-neutral-500">
            KOREA AUTO TRADE connects buyers with quality Korean used vehicles —
            with clear listings and responsive support.
          </p>
        </header>

        <section className="mb-8 max-w-3xl rounded-sm border border-[var(--line)] bg-white px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="site-heading text-[15px] text-neutral-800">
            Who we are
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed tracking-wide text-neutral-600">
            We are a Korea-based vehicle trading platform focused on used cars
            for domestic and international buyers. Our goal is simple: show
            accurate inventory, answer quickly, and guide every purchase from
            first inquiry through shipment.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed tracking-wide text-neutral-600">
            Whether you are looking for a hot deal, a ready-to-sell listing, or
            a stand-by vehicle, our team is ready to help via WhatsApp and
            KakaoTalk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="site-heading mb-4 text-[15px] text-neutral-800">
            What we offer
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {pillars.map((item) => (
              <div
                key={item.title}
                className="rounded-sm border border-[var(--line)] bg-white px-4 py-5"
              >
                <h3 className="text-[14px] font-medium tracking-wide text-neutral-800">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed tracking-wide text-neutral-500">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-[var(--line)] bg-neutral-50 px-5 py-6 text-center sm:px-7">
          <p className="text-[13.5px] tracking-wide text-neutral-700">
            {CONTACT_LINE}
          </p>
          <a
            href={`https://wa.me/${CONTACT_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-[#25D366] px-5 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:brightness-95"
          >
            WhatsApp {CONTACT_PHONE}
          </a>
        </section>
      </div>
    </div>
  );
}
