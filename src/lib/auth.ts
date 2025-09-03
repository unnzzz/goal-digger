import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: { label: "Email", type:"text" }, password: { label:"Password", type:"password" } },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name ?? null } : null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) (token as any).userId = (user as any).id; return token; },
    async session({ session, token }) { if (token) (session as any).user.id = (token as any).userId; return session; },
  }
};
