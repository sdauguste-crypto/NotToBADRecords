import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/structured-data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/simon-auguste/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/listen/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/press/`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
