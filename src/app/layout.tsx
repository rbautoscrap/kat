import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import { Header } from "@/components/Header";
import { SiteSearchBar } from "@/components/SiteSearchBar";
import { Footer } from "@/components/Footer";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const noto = Noto_Sans_KR({
  variable: "--font-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KOREA AUTO TRADE",
  description: "Vehicle trading platform",
};

function SiteSearchBarFallback() {
  return (
    <div className="border-b border-[var(--line)] bg-neutral-50">
      <div className="site-container py-4 sm:py-5">
        <div className="mx-auto h-11 max-w-2xl rounded-md border border-neutral-200 bg-white sm:h-12" />
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${noto.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-[15px] text-neutral-800 antialiased">
        <Header />
        <Suspense fallback={<SiteSearchBarFallback />}>
          <SiteSearchBar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
