import type { ReactNode } from "react";
import Image from "next/image";
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
    body: "We provide accurate, high-resolution media and detailed inspection reports to minimize risk and maximize purchase confidence.",
  },
  {
    title: "Transparent & Secure Trades",
    body: "Our streamlined purchasing process and secure transaction support ensure safe, hassle-free global cross-border trading.",
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

const contacts = [
  {
    label: "Email",
    value: (
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-medium text-neutral-800 underline-offset-2 hover:underline"
      >
        {CONTACT_EMAIL}
      </a>
    ),
  },
  {
    label: "WhatsApp / KakaoTalk",
    value: (
      <span className="font-medium tabular-nums text-neutral-800">
        {CONTACT_PHONE}
      </span>
    ),
  },
  {
    label: "Business Hours",
    value: (
      <span className="font-medium text-neutral-800">{CONTACT_HOURS}</span>
    ),
  },
];

export default function AboutUsPage() {
  return (
    <div lang="en">
      <div className="site-container py-10 sm:py-12">
        <div className="mb-5">
          <BackButton href="/" />
        </div>

        {/* 1. Heading — logo as soft watermark behind the copy */}
        <header className="relative mb-8 overflow-hidden border-b border-[var(--line)] pb-10 pt-2 sm:mb-10 sm:pb-12 sm:pt-3">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[8%] flex justify-center sm:top-[4%]"
          >
            <Image
              src="/brand/rbauto-logo.png"
              alt=""
              width={520}
              height={520}
              priority
              className="h-[13rem] w-auto object-contain opacity-[0.09] sm:h-[17rem] sm:opacity-[0.08]"
            />
          </div>
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-medium tracking-[0.14em] text-neutral-500 uppercase">
              About Us
            </p>
            <h1 className="site-heading mt-2 text-[1.55rem] text-neutral-900 sm:text-[1.9rem]">
              Welcome to KOREA AUTO TRADE
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed tracking-wide text-neutral-600 sm:text-[15px]">
              Your Trusted Global Partner for Salvage Vehicles, Automotive Parts
              &amp; Asset Recovery.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl space-y-10 sm:space-y-12">
          {/* 2. Overview */}
          <section>
            <SectionLabel>Company Overview</SectionLabel>
            <h2 className="site-heading mt-1.5 text-[1.05rem] text-neutral-800 sm:text-[1.15rem]">
              Bridging Korean supply with global demand
            </h2>
            <div className="mt-4 space-y-3.5 text-[14px] leading-[1.7] tracking-wide text-neutral-700 sm:text-[14.5px]">
              <p>
                At KOREA AUTO TRADE, we are transforming the salvage and used
                vehicle trading landscape through transparent data, verified
                inventory, and a reliable digital platform for buying and
                supplying vehicles and parts.
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

          {/* 3. Strengths — table layout */}
          <section>
            <SectionLabel>Core Strengths</SectionLabel>
            <h2 className="site-heading mt-1.5 text-[1.05rem] text-neutral-800 sm:text-[1.15rem]">
              Why professionals partner with us
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed tracking-wide text-neutral-600">
              Clear inventory, secure trades, and end-to-end support for global
              buyers.
            </p>

            <div className="mt-5 overflow-hidden rounded-sm border border-[var(--line)]">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[3.25rem] sm:w-[3.75rem]" />
                  <col />
                </colgroup>
                <tbody>
                  {strengths.map((item, index) => (
                    <tr
                      key={item.title}
                      className="border-b border-[var(--line)] last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="align-top border-r border-[var(--line)] bg-neutral-50 px-2.5 py-3.5 text-center text-[13px] font-semibold tabular-nums tracking-wide text-neutral-700 sm:px-3 sm:py-4 sm:text-[13.5px]"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </th>
                      <td className="min-w-0 px-3 py-3.5 sm:px-4 sm:py-4">
                        <p className="text-[14px] font-semibold tracking-wide text-neutral-900 sm:text-[14.5px]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[13.5px] leading-relaxed tracking-wide text-neutral-600 sm:text-[14px]">
                          {item.body}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Partnership — light panel, high contrast */}
          <section className="overflow-hidden rounded-sm border border-[var(--line)]">
            <div className="border-b border-[var(--line)] bg-neutral-50 px-4 py-3.5 sm:px-5">
              <SectionLabel>Collaboration</SectionLabel>
              <h2 className="site-heading mt-1 text-[1.05rem] text-neutral-900 sm:text-[1.15rem]">
                Open for Strategic Partnerships
              </h2>
            </div>
            <div className="space-y-3 px-4 py-5 text-[14px] leading-relaxed tracking-wide text-neutral-700 sm:px-5 sm:py-6 sm:text-[14.5px]">
              <p>
                We are constantly expanding our global network and actively
                seeking strategic business partnerships. Whether you are an
                insurance provider, salvage trading company, automotive
                exporter, or auto parts distributor, KOREA AUTO TRADE is ready
                to build a mutually beneficial future together.
              </p>
              <p>
                If you are interested in collaborating or exploring partnership
                opportunities, please do not hesitate to reach out to us.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex pt-1 text-[13.5px] font-semibold tracking-wide text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
              >
                Contact us about partnerships
              </a>
            </div>
          </section>

          {/* 5. Contact — label/value table */}
          <section>
            <SectionLabel>Contact</SectionLabel>
            <h2 className="site-heading mt-1.5 text-[1.05rem] text-neutral-800 sm:text-[1.15rem]">
              Get in touch
            </h2>

            <div className="mt-5 overflow-hidden rounded-sm border border-[var(--line)]">
              <table className="w-full table-fixed border-collapse text-left text-[13.5px] sm:text-[14px]">
                <colgroup>
                  <col className="w-[9.5rem] sm:w-[12rem]" />
                  <col />
                </colgroup>
                <tbody>
                  {contacts.map((row, index) => (
                    <tr
                      key={row.label}
                      className={
                        index < contacts.length - 1
                          ? "border-b border-[var(--line)]"
                          : ""
                      }
                    >
                      <th
                        scope="row"
                        className="border-r border-[var(--line)] bg-neutral-50 px-3 py-3 font-medium tracking-wide text-neutral-600 sm:px-4 sm:py-3.5"
                      >
                        {row.label}
                      </th>
                      <td className="min-w-0 break-words px-3 py-3 tracking-wide text-neutral-800 sm:px-4 sm:py-3.5">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#25D366] px-4 text-[13.5px] font-medium tracking-wide text-white transition hover:brightness-95"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-[13.5px] font-medium tracking-wide text-neutral-800 transition hover:bg-neutral-50"
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] font-medium tracking-[0.14em] text-neutral-500 uppercase">
      {children}
    </p>
  );
}
