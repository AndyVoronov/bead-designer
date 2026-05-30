import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/editor", "/design/", "/cart", "/profile", "/order-success"],
    },
    sitemap: "https://5minutesofsilence.ru/sitemap.xml",
  };
}
