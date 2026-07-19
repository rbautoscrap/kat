import { BackButton } from "@/components/BackButton";
import { CONTACT_LINE, CONTACT_WHATSAPP } from "@/lib/contact";

const steps = [
  {
    step: "01",
    title: "Receive price",
    highlight: "WhatsApp",
    lead: (
      <>
        Check the price via <em>WhatsApp</em>
      </>
    ),
    note: "Transportation fee, taxes, and export declaration certificate fees are charged separately.",
    details: null as string[] | null,
    icon: PhoneIcon,
  },
  {
    step: "02",
    title: "Generate invoice",
    highlight: "Currency",
    lead: (
      <>
        Choose your <em>currency</em>
      </>
    ),
    note: null,
    details: [
      "KRW — Tax invoice / Export declaration certificate",
      "USD — Export declaration certificate",
    ],
    icon: InvoiceIcon,
  },
  {
    step: "03",
    title: "Payment",
    highlight: "Deposit",
    lead: (
      <>
        Please keep the <em>deposit date</em>
      </>
    ),
    note: "Shipment is arranged only after the deposit is confirmed.",
    details: null,
    icon: PaymentIcon,
  },
  {
    step: "04",
    title: "Shipment release",
    highlight: "Shipping",
    lead: <>The buyer is responsible for shipping costs.</>,
    note: null,
    details: [
      "Arrange transport yourself, or",
      "Share your address and contact — we can arrange it for you",
    ],
    icon: TruckIcon,
  },
];

export default function HowToBuyPage() {
  return (
    <div lang="en">
      <div className="site-container py-10 sm:py-12">
        <div className="mb-4">
          <BackButton href="/" />
        </div>
        <header className="mb-8 max-w-2xl sm:mb-10">
          <p className="text-[12px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            Guide
          </p>
          <h1 className="site-heading mt-1.5 text-[1.6rem] text-neutral-800 sm:text-[1.85rem]">
            How to buy
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed tracking-wide text-neutral-500">
            A simple 4-step process from price inquiry to shipment.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.step}
                className="flex min-h-[280px] flex-col rounded-sm border border-[var(--line)] bg-white p-6 sm:p-7"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400">
                      STEP {item.step}
                    </p>
                    <h2 className="mt-1 text-[1.15rem] font-medium tracking-wide text-neutral-800">
                      {item.title}
                    </h2>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-neutral-800 ring-1 ring-neutral-200 sm:h-[4.5rem] sm:w-[4.5rem]">
                    <Icon />
                  </div>
                </div>

                <p className="text-[15px] leading-relaxed tracking-wide text-neutral-700 [&_em]:not-italic [&_em]:font-medium [&_em]:text-[var(--accent)]">
                  {item.lead}
                </p>

                {item.details && (
                  <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                    {item.details.map((line) => (
                      <li
                        key={line}
                        className="flex gap-2 text-[13px] leading-relaxed tracking-wide text-neutral-600"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {item.note && (
                  <p className="mt-auto pt-5 text-[12.5px] leading-relaxed tracking-wide text-neutral-400">
                    {item.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-[var(--line)] bg-white px-5 py-5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[13.5px] tracking-wide text-neutral-700">
            {CONTACT_LINE}
          </p>
          <a
            href={`https://wa.me/${CONTACT_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-[12.5px] font-medium tracking-wide text-white transition hover:brightness-95"
          >
            Open WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="7"
        y="2.5"
        width="10"
        height="19"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M10 5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <rect x="9" y="7.5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h8.5L19 7v13.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M15.5 3.5V7H19" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.5 11h5M9.5 14.5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="16.5" r="3.2" fill="white" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15.2 16.5l1 1 1.8-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="14.5" cy="9" r="4.2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14.5 7.2v3.6M13.2 9h2.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5 14.5c1.8-1.8 4-2.7 6.2-2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4.5 20c.4-3.2 2.6-5 5.8-5.2 1.4-.1 2.7.3 3.7 1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 15.5V8.2A1.2 1.2 0 0 1 4.2 7h8.1v8.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12.3 10.5h4.2l2.8 3.2V15.5h-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="17.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="17.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 12.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
