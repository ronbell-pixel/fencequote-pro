import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./detail.css";
import "./upgrade.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
