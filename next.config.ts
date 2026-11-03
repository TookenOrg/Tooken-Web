import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL ?? "http://localhost:8080/api/v1"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Trust the OS certificate store so Google Fonts download behind
  // TLS-intercepting corporate proxies.
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },

  // The browser only talks to this origin: requests are forwarded to the API
  // server-side, so CORS never applies (the Idempotency-Key header included).
  async rewrites() {
    return [
      { source: "/api/backend/:path*", destination: `${backendUrl}/:path*` },
    ];
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
