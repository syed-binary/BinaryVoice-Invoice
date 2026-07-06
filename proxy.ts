import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 "proxy" convention (formerly middleware).
// NextAuth's edge-safe handler enforces the `authorized` callback in authConfig.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect everything except Next internals, auth API, static assets and uploads.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
