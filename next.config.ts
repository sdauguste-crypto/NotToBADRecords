import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/NotToBADRecords",
  assetPrefix: "/NotToBADRecords/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
