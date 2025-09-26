import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "fallback-secret") as any;
    
    if (!decoded.userId || !decoded.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true,
        name: true, 
        email: true, 
        coins: true, 
        avatarKey: true, 
        isAdmin: true,
        statINT: true, 
        statSTR: true, 
        statVIT: true, 
        statAES: true, 
        statWLH: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Mobile auth error:', error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}




