import { BackButton } from "@/components/BackButton";
import {
  CONTACT_EMAIL,
  CONTACT_HOURS,
  CONTACT_PHONE,
  CONTACT_WHATSAPP,
} from "@/lib/contact";

const strengths = [
  {
    title: "Verified Vehicle Inventory",
    body: "We provide accurate, high-resolution media and detailed inspection reports to minimize risk and maximize bidding confidence.",
  },
  {
    title: "Transparent & Secure Trades",
    body: "Our streamlined auction framework and secure transaction process ensure safe, hassle-free global cross-border trading.",
  },
  {
    title: "Direct Supply Pipeline",
    body: "Access premium salvage vehicles and auto parts sourced directly from top-tier Korean networks at competitive market prices.",
  },
  {
    title: "End-to-End Operational Support",
    body: "From initial inspection and document management to smooth shipping coordination, we support your business every step of the way.",
  },
];

export default function AboutUsPage() {
  return (
    <div lang="en">
      <div className="site-container py-10 sm:py-14">
        <div className="mb-6 sm:mb-8">
          <BackButton href="/" />
        </div>

        {/* 1. Main heading */}
        <header className="relative mb-12 overflow-hidden border-b border-[var(--line)] pb-10 sm:mb-14 sm:pb-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.045),_transparent_70%)]"
          />
          <p className="text-[11px] font-medium tracking-[0.18em] text-neutral-400 uppercase">
            About Us
          </p>
          <h1 className="site-heading mt-3 max-w-4xl text-[1.75rem] leading-tight text-neutral-900 sm:text-[2.35rem] sm:leading-[1.15]">
            Welcome to{" "}
            <span className="whitespace-nowrap">KOREA AUTO TRADE</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed tracking-wide text-neutral-500 sm:text-[16px]">
            Your Trusted Global Partner for Salvage Vehicles, Automotive Parts
            &amp; Asset Recovery.
          </p>
        </header>

        <div className="mx-auto max-w-3xl space-y-14 sm:space-y-16">
          {/* 2. Company overview */}
          <section>
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-400 uppercase">
              Company Overview
            </p>
            <h2 className="site-heading mt-2 text-[1.15rem] text-neutral-800 sm:text-[1.25rem]">
              Bridging Korean supply with global demand
            </h2>
            <div className="mt-5 space-y-4 border-l-2 border-neutral-900 pl-5 text-[14.5px] leading-[1.75] tracking-wide text-neutral-600 sm:pl-6">
              <p>
                At KOREA AUTO TRADE, we are transforming the salvage and used
                vehicle trading landscape through transparent data, verified
                inventory, and an advanced digital auction platform.
              </p>
              <p>
                Based in South Korea, we bridge the gap between major domestic
                suppliers—including insurance companies, car rental fleets, and
                dismantling centers—and professional global buyers seeking
                high-quality salvage assets, core auto parts, and vehicle
                inventory.
              </p>
            </div>
          </section>

          {/* 3. Core strengths */}
          <section>
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-400 uppercase">
              Core Strengths
            </p>
            <h2 className="site-heading mt-2 text-[1.15rem] text-neutral-800 sm:text-[1.25rem]">
              Why professionals partner with us
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed tracking-wide text-neutral-500">
              Why leading automotive professionals around the world partner with
              us:
            </p>

            <ol className="mt-7 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {strengths.map((item, index) => (
                <li
                  key={item.title}
                  className="group grid gap-3 py-6 transition-colors duration-300 hover:bg-neutral-50/80 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-6 sm:px-1"
                >
                  <span className="font-mono text-[13px] tracking-[0.08em] text-neutral-300 transition-colors duration-300 group-hover:text-neutral-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-medium tracking-wide text-neutral-900">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed tracking-wide text-neutral-500">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 4. Partnership */}
          <section className="bg-[var(--banner)] px-5 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-400 uppercase">
              Collaboration
            </p>
            <h2 className="site-heading mt-2 text-[1.2rem] text-white sm:text-[1.35rem]">
              Open for Strategic Partnerships
            </h2>
            <div className="mt-4 space-y-3 text-[14px] leading-relaxed tracking-wide text-neutral-300">
              <p>
                We are constantly expanding our global network and actively
                seeking strategic business partnerships. Whether you are an
                insurance provider, salvage auction company, automotive
                exporter, or auto parts distributor, KOREA AUTO TRADE is ready
                to build a mutually beneficial future together.
              </p>
              <p>
                If you are interested in collaborating or exploring partnership
                opportunities, please do not hesitate to reach out to us.
              </p>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-6 inline-flex items-center border-b border-white/50 pb-0.5 text-[13.5px] font-medium tracking-wide text-white transition hover:border-white"
            >
              Contact us about partnerships →
            </a>
          </section>

          {/* 5. Contact */}
          <section className="pb-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-400 uppercase">
              Contact
            </p>
            <h2 className="site-heading mt-2 text-[1.15rem] text-neutral-800 sm:text-[1.25rem]">
              Get in touch
            </h2>

            <dl className="mt-6 grid gap-0 border border-[var(--line)] sm:grid-cols-3">
              <div className="border-b border-[var(--line)] px-4 py-5 sm:border-r sm:border-b-0 sm:px-5">
                <dt className="text-[11px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
                  Email
                </dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="break-all text-[14px] font-medium tracking-wide text-neutral-800 hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </dd>
              </div>
              <div className="border-b border-[var(--line)] px-4 py-5 sm:border-r sm:border-b-0 sm:px-5">
                <dt className="text-[11px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
                  WhatsApp / KakaoTalk
                </dt>
                <dd className="mt-2 text-[14px] font-medium tracking-wide text-neutral-800">
                  {CONTACT_PHONE}
                </dd>
              </div>
              <div className="px-4 py-5 sm:px-5">
                <dt className="text-[11px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
                  Business Hours
                </dt>
                <dd className="mt-2 text-[14px] font-medium tracking-wide text-neutral-800">
                  {CONTACT_HOURS}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#25D366] px-5 text-[13.5px] font-medium tracking-wide text-white transition hover:brightness-95"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-[13.5px] font-medium tracking-wide text-neutral-800 transition hover:bg-neutral-50"
              >
                Email us
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
