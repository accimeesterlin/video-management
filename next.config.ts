import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during builds to ignore warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds to ignore warnings
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
