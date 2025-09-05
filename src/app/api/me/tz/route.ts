import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidTZ } from "@/lib/time";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tz } = await req.json().catch(() => ({ tz: "" }));
  const iana = (tz || "").trim();
  if (!iana || !isValidTZ(iana)) return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });

  await prisma.user.update({ where: { email: session.user.email }, data: { tz: iana } });
  return NextResponse.json({ ok: true, tz: iana });
}
