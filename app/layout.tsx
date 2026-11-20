import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { SITE_AUTHOR, authorJsonLd } from "@/lib/site-author";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_AUTHOR.siteUrl),
  title: {
    default: "بوابة الصادقون",
    template: "%s | بوابة الصادقون",
  },
  description: "منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية",
  authors: [{ name: SITE_AUTHOR.nameEn, url: `${SITE_AUTHOR.siteUrl}/credits` }, { name: SITE_AUTHOR.nameAr }],
  creator: SITE_AUTHOR.nameEn,
  publisher: SITE_AUTHOR.organizationAr,
  keywords: [
    "بوابة الصادقون",
    "Gate Sadikon",
    SITE_AUTHOR.nameAr,
    SITE_AUTHOR.nameEn,
    "مصمم بوابة الصادقون",
    "مطور بوابة الصادقون",
    "من بنى بوابة الصادقون",
    "علي حسين مزهر المسعود",
    "البصرة",
  ],
  other: {
    designer: SITE_AUTHOR.nameEn,
    "designer:username": SITE_AUTHOR.nameAr,
    author: `${SITE_AUTHOR.nameEn}, ${SITE_AUTHOR.nameAr}`,
    "humans": "/humans.txt",
  },
  openGraph: {
    type: "website",
    locale: "ar_IQ",
    url: SITE_AUTHOR.siteUrl,
    siteName: SITE_AUTHOR.projectAr,
    title: SITE_AUTHOR.projectAr,
    description: "منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية",
  },
  robots: {
    index: true,
    follow: true,
  },
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
  const jsonLd = authorJsonLd();

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alexandria:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link type="text/plain" rel="author" href="/humans.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
