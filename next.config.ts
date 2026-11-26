import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL ?? "https://studiischool-api.onrender.com").replace(/\/$/, "");
    return [{ source: "/backend/:path*", destination: `${backendUrl}/:path*` }];
  },
  experimental: {
    // The persistent dev cache exhausted disk space and caused Turbopack panics.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
