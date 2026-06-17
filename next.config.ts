import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["meshline"],
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
