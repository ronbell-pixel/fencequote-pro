import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./esign.css";
import "leaflet/dist/leaflet.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

const image = "https://fencequote-pro-v1.rb-mo.chatgpt.site/og.png";
export const metadata: Metadata = {
  title: "FenceQuote Pro",
  description:
    "Multi-company fence estimating, pricing, proposals, and approvals.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "FenceQuote Pro",
    description: "Quote confidently. Build profitably.",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "FenceQuote Pro",
    description: "Field-ready estimating for modern fence companies.",
    images: [image],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
