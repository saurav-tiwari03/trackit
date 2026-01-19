import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Empty turbopack config to silence warnings
  turbopack: {},
  
  // Headers for service worker and caching
  async headers() {
    return [
      {
        // Allow service worker to control all pages
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        // Cache static assets
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
