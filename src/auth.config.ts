import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
