import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://sculptedbyruby.example",
  ),
  title: {
    default: "Sculpted by Ruby | Beauty, thoughtfully tailored",
    template: "%s | Sculpted by Ruby",
  },
  description:
    "Thoughtfully tailored beauty treatments by Sculpted by Ruby, with every appointment shaped around you.",
}; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
