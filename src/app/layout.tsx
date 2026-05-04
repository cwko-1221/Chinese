import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Inter } from "next/font/google";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-noto",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "NCS Cantonese Lab",
    template: "%s | NCS Cantonese Lab",
  },
  description: "粵語與繁體中文學習平台 — 專為非華語學生設計的互動練習系統。",
};

export const viewport: Viewport = {
  themeColor: "#0d0f1d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant-HK"
      className={`h-full antialiased ${notoSansTC.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

