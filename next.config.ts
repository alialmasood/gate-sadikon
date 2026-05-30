import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }];
  },
};

export default nextConfig;
