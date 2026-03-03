import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["400", "500", "700", "800"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
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
      <body className={`${tajawal.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
