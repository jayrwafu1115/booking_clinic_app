import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      // Single RegExp: ignore node_modules, .git, and Windows root-level system files (C:\pagefile.sys etc.)
      ignored: /node_modules|\.git|^[A-Z]:\\[^\\]+$/,
    };
    return config;
  },
};

export default nextConfig;
