import type { MetadataRoute } from "next";
import { SITE_AUTHOR } from "@/lib/site-author";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_AUTHOR.siteUrl;
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/credits`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
