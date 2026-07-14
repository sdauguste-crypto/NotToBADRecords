import type { NextConfig } from "next";

// Served from the domain root (www.nottobadrecords.com) — no basePath.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
