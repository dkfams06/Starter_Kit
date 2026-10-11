import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signInSchema } from "@/lib/auth/validation";
import { getRequestMetadata } from "@/lib/auth/request-metadata";
import { writeAuditLogBestEffort } from "@/lib/auth/audit";
import { isLoginRateLimited } from "@/lib/auth/login-rate-limit";
import { authConfig } from "@/auth.config";

const dummyPasswordHash = hashPassword("Dummy-password-1!not-an-account");

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials, request) {
        const metadata = getRequestMetadata(request);
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success || (await isLoginRateLimited(metadata.ipAddress))) {
          await writeAuditLogBestEffort({
            action: "LOGIN_FAILURE",
            targetType: "User",
            ...metadata,
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
        const passwordMatches = await verifyPassword(
          passwordHash,
          parsed.data.password,
        );

        if (!user || !user.isActive || !passwordMatches) {
          await writeAuditLogBestEffort({
            action: "LOGIN_FAILURE",
            targetType: "User",
            targetId: user?.id,
            ...metadata,
          });
          return null;
        }

        await writeAuditLogBestEffort({
          actorId: user.id,
          action: "LOGIN_SUCCESS",
          targetType: "User",
          targetId: user.id,
          ...metadata,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string" &&
        (token.role === "ADMIN" || token.role === "USER")
      ) {
        session.user.id = token.userId;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const userId = "token" in message && typeof message.token?.userId === "string"
        ? message.token.userId
        : null;
      await writeAuditLogBestEffort({
        actorId: userId,
        action: "LOGOUT",
        targetType: "User",
        targetId: userId,
      });
    },
  },
});
