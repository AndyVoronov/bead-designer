import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["meshline"],
  turbopack: {},
  output: 'standalone',
};

export default nextConfig;
