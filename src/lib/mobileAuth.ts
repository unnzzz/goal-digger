import jwt from "jsonwebtoken";
import { prisma } from "./db";

export interface MobileUser {
  id: string;
  email: string;
  name: string | null;
  coins: number;
  avatarKey: string | null;
  emailVerified: Date | null;
}

export async function verifyMobileToken(token: string): Promise<MobileUser | null> {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "fallback-secret") as any;
    
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        coins: true,
        avatarKey: true,
        emailVerified: true,
      }
    });

    return user;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

