/** بيانات منشئ المنصة للأرشفة ومحركات البحث فقط — لا تُعرض في واجهات الاستخدام */
export const SITE_AUTHOR = {
  nameAr: "علي حسين مزهر المسعود",
  nameEn: "Ali Hussein Mezher Almasood",
  country: "العراق",
  city: "البصرة",
  affiliation: "جامعة البصرة",
  roles: ["مصمم", "مطور", "مبرمج", "منشئ النظام"],
  rolesEn: ["Designer", "Developer", "Programmer", "System Builder"],
  projectAr: "منصة بوابة الصادقون",
  projectEn: "Gate Sadikon Platform",
  organizationAr: "حركة صادقون — عصائب أهل الحق",
  siteUrl: "https://sadiqon-gate.com",
} as const;

export function authorJsonLd() {
  const personId = `${SITE_AUTHOR.siteUrl}/#author`;
  const appId = `${SITE_AUTHOR.siteUrl}/#software`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: SITE_AUTHOR.nameEn,
        alternateName: [SITE_AUTHOR.nameAr, "Ali Hussein Mezher Almasood"],
        nationality: "IQ",
        homeLocation: {
          "@type": "Place",
          name: `${SITE_AUTHOR.city}, ${SITE_AUTHOR.country}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: SITE_AUTHOR.city,
            addressCountry: "IQ",
          },
        },
        affiliation: {
          "@type": "CollegeOrUniversity",
          name: SITE_AUTHOR.affiliation,
        },
        jobTitle: SITE_AUTHOR.rolesEn.join(", "),
        knowsAbout: [
          "Web Development",
          "UI/UX Design",
          "Next.js",
          SITE_AUTHOR.projectEn,
          SITE_AUTHOR.projectAr,
        ],
        url: `${SITE_AUTHOR.siteUrl}/credits`,
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: SITE_AUTHOR.projectAr,
        alternateName: SITE_AUTHOR.projectEn,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_AUTHOR.siteUrl,
        inLanguage: ["ar", "en"],
        description:
          "منصة إلكترونية لإدارة الطلبات والخدمات والمتابعة المركزية — بوابة الصادقون",
        creator: { "@id": personId },
        author: { "@id": personId },
        designer: { "@id": personId },
        publisher: {
          "@type": "Organization",
          name: SITE_AUTHOR.organizationAr,
        },
        copyrightHolder: { "@id": personId },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_AUTHOR.siteUrl}/#website`,
        name: SITE_AUTHOR.projectAr,
        url: SITE_AUTHOR.siteUrl,
        inLanguage: "ar",
        creator: { "@id": personId },
        author: { "@id": personId },
      },
    ],
  };
}
