export const runtime = 'nodejs';

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/mailer";

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

    // If user already exists and is verified, block; if unverified, allow resending a token and updating fields
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerified) return json({ error: "email already in use" }, 409);

    // Create or update user (unverified)
    const passwordHash = await bcrypt.hash(password, 10);

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            name,
            // only update avatar if client sent a valid one; otherwise keep existing
            ...(avatarKey ? { avatarKey } : {}),
          },
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            coins: 0,
            // stats default to 0 via schema; just set avatar if provided
            avatarKey,
          },
        });

    // Create verification token (replace any previous)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    // Ensure you have a VerificationToken model in Prisma with fields:
    // identifier (String), token (String @unique), expires (DateTime)
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${base}/api/auth/verify?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    await sendVerificationEmail(email, verifyUrl);

    return json(
      { ok: true, message: "Check your email for a verification link." },
      201
    );
  } catch (err: any) {
    if (err?.code === "P2002") return json({ error: "email already in use" }, 409);
    console.error("signup error:", err);
    return json({ error: "Internal error" }, 500);
  }
}
