import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The persistent dev cache exhausted disk space and caused Turbopack panics.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
