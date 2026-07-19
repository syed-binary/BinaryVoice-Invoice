import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-mode assets/HMR are blocked cross-origin by default, which leaves
  // tunnel visitors with an unhydrated (dead) page — allow the tunnel host.
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      // Allow form submissions (server actions) through public tunnels —
      // used for contractor onboarding / signing links shared externally.
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
