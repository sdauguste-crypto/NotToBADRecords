import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/NotToBADRecords",
  assetPrefix: "/NotToBADRecords/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
