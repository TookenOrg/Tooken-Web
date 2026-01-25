import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "4.bp.blogspot.com",
      },
    ],
  },
};

export default nextConfig;
