import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const teamMember = await prisma.teamMember.findUnique({
          where: { email: credentials.email },
        });

        if (!teamMember) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          teamMember.password
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: teamMember.id,
          email: teamMember.email,
          name: teamMember.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const teamMember = await prisma.teamMember.findUnique({
          where: { id: token.id as string },
        });

        if (teamMember) {
          session.user.id = token.id as string;
          session.user.role = teamMember.role;
          try {
            session.user.permissions = JSON.parse(teamMember.permissions || "{}");
          } catch (e) {
            session.user.permissions = {
              pages: {
                contacts: false,
                pipeline: false,
                followups: false,
                payments: false,
              },
              actions: {
                add_contacts: false,
                import_contacts: false,
                edit_contacts: false,
                delete_contacts: false,
              },
              dashboard: {
                see_revenue: false,
                see_analytics: false,
                see_pipeline_stats: false,
              },
            };
          }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production",
};