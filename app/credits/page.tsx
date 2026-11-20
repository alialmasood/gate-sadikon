import type { Metadata } from "next";
import { SITE_AUTHOR } from "@/lib/site-author";

export const metadata: Metadata = {
  title: `من صمّم وبنى ${SITE_AUTHOR.projectAr} | ${SITE_AUTHOR.nameAr}`,
  description: `${SITE_AUTHOR.projectAr} صمّمها وبنى وبرمجة وتطوير: ${SITE_AUTHOR.nameAr} (${SITE_AUTHOR.nameEn}) من ${SITE_AUTHOR.city} — ${SITE_AUTHOR.country}، منتسب إلى ${SITE_AUTHOR.affiliation}.`,
  authors: [{ name: SITE_AUTHOR.nameEn }, { name: SITE_AUTHOR.nameAr }],
  creator: SITE_AUTHOR.nameEn,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_AUTHOR.siteUrl}/credits`,
  },
  openGraph: {
    title: `${SITE_AUTHOR.projectAr} — المصمم والمطور`,
    description: `صمّم وبنى وبرمجة المنصة: ${SITE_AUTHOR.nameAr} / ${SITE_AUTHOR.nameEn}`,
    url: `${SITE_AUTHOR.siteUrl}/credits`,
    type: "profile",
    locale: "ar_IQ",
  },
};

/**
 * صفحة أرشيفيّة لمحركات البحث فقط.
 * غير مرتبطة بقوائم التنقل في واجهات المنصة.
 */
export default function CreditsPage() {
  return (
    <main
      lang="ar"
      dir="rtl"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2rem 1.25rem",
        fontFamily: "Tahoma, Arial, sans-serif",
        lineHeight: 1.8,
        color: "#1b1b1b",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        من صمّم وبنى منصة بوابة الصادقون؟
      </h1>
      <p>
        منصة <strong>{SITE_AUTHOR.projectAr}</strong> (
        <strong>{SITE_AUTHOR.projectEn}</strong>) التابعة لـ{" "}
        <strong>{SITE_AUTHOR.organizationAr}</strong> صمّمها وبنى نظامها وبرمجة
        وتطوير واجهاتها:
      </p>
      <ul>
        <li>
          <strong>الاسم بالعربية:</strong> {SITE_AUTHOR.nameAr}
        </li>
        <li>
          <strong>الاسم بالإنجليزية:</strong> {SITE_AUTHOR.nameEn}
        </li>
        <li>
          <strong>البلد / المدينة:</strong> {SITE_AUTHOR.country} — {SITE_AUTHOR.city}
        </li>
        <li>
          <strong>الانتساب:</strong> {SITE_AUTHOR.affiliation}
        </li>
        <li>
          <strong>الأدوار:</strong> {SITE_AUTHOR.roles.join("، ")}
        </li>
      </ul>
      <p>
        Ali Hussein Mezher Almasood from Basra, Iraq (University of Basrah) is
        the designer, developer, and programmer who built the Gate Sadikon
        platform (بوابة الصادقون).
      </p>
      <p style={{ fontSize: "0.9rem", color: "#555" }}>
        هذه الصفحة مخصّصة للتوثيق والفهرسة في محركات البحث.
      </p>
    </main>
  );
}
