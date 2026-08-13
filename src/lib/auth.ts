import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name: string;
      role: Role;
      collegeId?: string | null;
      departmentId?: string | null;
      year?: number | null;
      rollNumber?: string | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    role: Role;
    collegeId?: string | null;
    departmentId?: string | null;
    year?: number | null;
    rollNumber?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    collegeId?: string | null;
    departmentId?: string | null;
    year?: number | null;
    rollNumber?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email or Roll Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Login ID and password required");
        }

        // iOS often auto-capitalizes roll numbers — normalize carefully
        const loginId = String(credentials.email).trim();
        const loginLower = loginId.toLowerCase();
        const password = String(credentials.password);

        // Avoid Prisma mode:"insensitive" (can fail on some PG setups).
        // Try exact email, exact roll, then case-insensitive roll via raw filter in JS fallback.
        let user =
          (await prisma.user.findFirst({
            where: { email: loginLower },
          })) ||
          (await prisma.user.findFirst({
            where: { rollNumber: loginId },
          }));

        if (!user) {
          // Case-insensitive roll (iOS often capitalizes input)
          user = await prisma.user.findFirst({
            where: {
              rollNumber: { equals: loginId, mode: "insensitive" },
            },
          });
        }

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials");
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // NextAuth expects a stable string identity; students may have null email
        const identity = user.email || user.rollNumber || user.id;

        return {
          id: user.id,
          email: identity,
          name: user.name,
          role: user.role,
          collegeId: user.collegeId,
          departmentId: user.departmentId,
          year: user.year,
          rollNumber: user.rollNumber,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.collegeId = user.collegeId;
        token.departmentId = user.departmentId;
        token.year = user.year;
        token.rollNumber = user.rollNumber;
        token.email = user.email || undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.collegeId = token.collegeId;
        session.user.departmentId = token.departmentId;
        session.user.year = token.year;
        session.user.rollNumber = token.rollNumber as string | null | undefined;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  // iOS Safari cookie friendliness (same-site first-party)
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Secure-next-auth.session-token`
          : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // Required on some hosts (Vercel) so CSRF/callback URLs resolve correctly
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
} as NextAuthOptions;
