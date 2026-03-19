import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hemmi.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/blog", "/blog/"],
        disallow: ["/api/", "/workspace", "/settings", "/auth/", "/demo/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
