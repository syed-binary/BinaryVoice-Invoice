import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no database / bcrypt here).
 * Shared between middleware (edge) and the full auth setup (node).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const role = (auth?.user as { role?: string } | undefined)?.role ?? "MEMBER";
      const isPortalRole = role === "CONTRACTOR" || role === "EMPLOYEE";

      if (isOnLogin) {
        if (isLoggedIn)
          return Response.redirect(
            new URL(isPortalRole ? "/portal" : "/dashboard", nextUrl),
          );
        return true;
      }
      if (!isLoggedIn) return false;

      // Edge-safe path-prefix gating from the JWT role only. Fine-grained
      // capability checks live in lib/permissions.ts (node).
      const path = nextUrl.pathname;
      // API routes authorize themselves (capabilities / own-entity checks) —
      // never redirect them, or portal file access breaks.
      if (isPortalRole && !path.startsWith("/portal") && !path.startsWith("/api")) {
        return Response.redirect(new URL("/portal", nextUrl));
      }
      if (!isPortalRole && path.startsWith("/portal")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      const hrOnly = path.startsWith("/hr");
      const payrollOnly = path.startsWith("/payroll");
      if (hrOnly && !["ADMIN", "FINANCE", "HR"].includes(role)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (payrollOnly && !["ADMIN", "FINANCE"].includes(role)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "MEMBER";
      }
      return session;
    },
  },
  providers: [], // added in auth.ts (node runtime)
} satisfies NextAuthConfig;
