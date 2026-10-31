import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import "./workspace.css";

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

const zodiak = localFont({
  src: "./fonts/Zodiak-Variable.woff2",
  variable: "--font-zodiak",
  weight: "100 900",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casper: your agent, their agent, one room",
  description:
    "Everyone on your team is babysitting their own agents alone. Casper puts you all, and every agent, in one room, so the team watches the work together and approves it together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${satoshi.variable} ${zodiak.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-night text-ink font-sans">{children}</body>
    </html>
  );
}
