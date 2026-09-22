import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic, Noto_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const displayFont = Alexandria({
  weight: ["600", "700", "800"],
  subsets: ["arabic"],
  variable: "--font-display-arabic",
  display: "swap",
});

const headingFont = IBM_Plex_Sans_Arabic({
  weight: ["500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-heading-arabic",
  display: "swap",
});

const bodyFont = Noto_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-body-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "بوابة الصادقون",
  description: "منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "بوابة الصادقون",
  },
  icons: {
    icon: "/gat.png",
    apple: "/sadiqooniqon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${displayFont.variable} ${headingFont.variable} ${bodyFont.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
