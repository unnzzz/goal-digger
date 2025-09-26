export const runtime = 'nodejs';

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS() {
  return json({}, 200);
}

export async function POST(req: Request) {
  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");

    if (!email || !password) {
      return json({ error: "Email and password required" }, 400);
    }

    // Find user by email
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        coins: true,
        avatarKey: true,
        emailVerified: true,
      }
    });

    if (!user) {
      return json({ error: "Invalid credentials" }, 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return json({ error: "Invalid credentials" }, 401);
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    // Return user data and token
    return json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coins: user.coins,
        avatarKey: user.avatarKey,
        emailVerified: user.emailVerified,
      }
    });

  } catch (err: any) {
    console.error("Login error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

