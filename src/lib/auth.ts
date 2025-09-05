import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: { email: { label: "Email", type: "text" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        const email = creds?.email?.trim().toLowerCase();
        const password = creds?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // ✅ enforce verified email
        if (!user.emailVerified) {
          // Returning null will surface a generic error. Alternatively:
          // throw new Error("Please verify your email first.");
          return null;
        }

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).userId = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (token) (session as any).user.id = (token as any).userId;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
