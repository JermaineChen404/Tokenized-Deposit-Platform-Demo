import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "porto/internal": false,
      accounts: false,
    };
    return config;
  },
};

export default nextConfig;
