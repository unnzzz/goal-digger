import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
    if (!token || !email) return NextResponse.redirect(new URL("/verify?status=invalid", req.url));

    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt || vt.identifier !== email) return NextResponse.redirect(new URL("/verify?status=invalid", req.url));
    if (vt.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(new URL("/verify?status=expired", req.url));
    }

    await prisma.$transaction([
      prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(new URL("/verify?status=success", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/verify?status=error", req.url));
  }
}
