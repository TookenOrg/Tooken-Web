import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL ?? "http://localhost:8080/api/v1"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,

  // DEMO_MODE gates illustrative accounts and bank details rendered by client
  // components, so it must be inlined into the browser bundle at build time.
  env: { DEMO_MODE: process.env.DEMO_MODE ?? "false" },

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
