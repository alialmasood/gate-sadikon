import type { MetadataRoute } from "next";
import { SITE_AUTHOR } from "@/lib/site-author";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/system"],
    },
    sitemap: `${SITE_AUTHOR.siteUrl}/sitemap.xml`,
    host: SITE_AUTHOR.siteUrl,
  };
}
