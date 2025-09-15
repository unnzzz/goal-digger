export const runtime = 'nodejs';

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ALLOWED_AVATARS = new Set([
  "monkey",
  "penguin", 
  "cat",
  "lion",
  "dog",
  "rabbit",
  "elephant",
  "duck",
  "owl",
]);

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
    const name = payload?.name ? String(payload.name) : null;

    // avatarKey is optional; if provided and valid, we save it
    const avatarKeyRaw =
      typeof payload?.avatarKey === "string" ? payload.avatarKey.trim() : "";
    const avatarKey = ALLOWED_AVATARS.has(avatarKeyRaw)
      ? avatarKeyRaw
      : null;

    if (!email || !password) return json({ error: "email and password required" }, 400);

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return json({ error: "email already in use" }, 409);

    // Create user with immediate email verification
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        coins: 0,
        emailVerified: new Date(), // Immediately verify the user
        avatarKey,
      },
    });

    return json(
      { ok: true, message: "Account created successfully! You can now sign in." },
      201
    );
  } catch (err: any) {
    if (err?.code === "P2002") return json({ error: "email already in use" }, 409);
    console.error("signup error:", err);
    return json({ error: "Internal error" }, 500);
  }
}
