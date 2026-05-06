import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@octapos/shared-types", "@octapos/shared-utils"],
};

export default nextConfig;
