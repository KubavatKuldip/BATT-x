import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
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

        const email = (credentials.email as string).toLowerCase().trim();

        // Demo credentials shortcut — local dev only. Refuses to run in production
        // and refuses to run if NEXTAUTH_SECRET is the placeholder, so a misconfigured
        // deploy can't accept "demo123".
        if (
          process.env.NODE_ENV !== "production" &&
          process.env.NEXTAUTH_SECRET !== "your-secret-key-change-in-production" &&
          !process.env.NEXTAUTH_SECRET?.startsWith("your-") &&
          email === "demo@battx.com" &&
          credentials.password === "demo123"
        ) {
          return {
            id: "demo-user",
            email: "demo@battx.com",
            name: "Demo User",
            role: "CONSUMER",
          };
        }

        // Real DB lookup
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await compare(credentials.password as string, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async authorized({ auth, request }: any) {
      // Used by NextAuth middleware helper; the actual gating is in middleware.ts
      return !!auth;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

// Single NextAuth instance — both the route handler and any
// server-side code (`auth()` for RSC) share this, so the session
// JWTs they sign/verify are valid against each other.
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
