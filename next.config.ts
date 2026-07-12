import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow form submissions (server actions) through public tunnels —
      // used for contractor onboarding / signing links shared externally.
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
