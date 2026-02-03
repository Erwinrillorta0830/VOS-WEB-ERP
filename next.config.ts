import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/spring/:path*",
        // Fallback to localhost if env var is missing, but it should be read from .env.local
        destination: `${process.env.SPRING_BOOT_API_URL || "http://localhost:8083"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
