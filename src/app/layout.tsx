import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { SiteSearchBar } from "@/components/SiteSearchBar";
import { Footer } from "@/components/Footer";
import "./globals.css";

const pretendard = localFont({
  src: "./../fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-body",
  fallback: [
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Segoe UI",
    "sans-serif",
  ],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KOREA AUTO TRADE",
  description: "Vehicle trading platform",
  icons: {
    // Version query busts Cloudflare/browser cache of the old Vercel icon.
    icon: [
      { url: "/favicon.ico?v=rbauto-20260725", sizes: "any" },
      { url: "/favicon.png?v=rbauto-20260725", type: "image/png", sizes: "32x32" },
      {
        url: "/brand/favicon.png?v=rbauto-20260725",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/favicon.ico?v=rbauto-20260725",
    apple: [
      {
        url: "/apple-touch-icon.png?v=rbauto-20260725",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pretendard.variable} h-full`}>
      <body
        className={`${pretendard.className} flex min-h-full flex-col bg-white text-[16px] text-neutral-800 antialiased`}
      >
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
