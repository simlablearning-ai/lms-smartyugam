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

        const loginId = credentials.email.trim();
        const loginLower = loginId.toLowerCase();

        // Try email first, then roll number (case-insensitive roll)
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: loginLower },
              { rollNumber: loginId },
              { rollNumber: { equals: loginId, mode: "insensitive" } },
            ],
          },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials");
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
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
  secret: process.env.NEXTAUTH_SECRET,
};
