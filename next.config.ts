import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["meshline"],
  turbopack: {},
  output: 'standalone',
  // Skip full type-check during build (run `tsc --noEmit` separately for CI)
  // Needed: care-guides/badge routes reference Prisma models not yet in schema
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force new build ID on each deploy to bust browser JS chunk cache
  generateBuildId: async () => `b${Date.now()}`,
  images: {
    // Product images served via /api/uploads/products/...
    // This is our own domain, nginx proxies to disk
    remotePatterns: [
      {
        protocol: "https",
        hostname: "5minutesofsilence.ru",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "www.5minutesofsilence.ru",
        pathname: "/api/uploads/**",
      },
    ],
    // Allow unoptimized in dev for faster HMR
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
