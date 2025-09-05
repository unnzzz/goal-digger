export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidTZ, todayLabel } from "@/lib/time";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goalId = params.id;
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const headerTZ = (req.headers.get("x-timezone") || "").trim();
    const tz = headerTZ && isValidTZ(headerTZ)
      ? headerTZ
      : (user.tz && isValidTZ(user.tz) ? user.tz! : "America/Detroit");

    if (!user.tz || !isValidTZ(user.tz)) {
      await prisma.user.update({ where: { id: user.id }, data: { tz } });
    }

    let startDate = goal.startDate;
    if (!startDate) {
      const updated = await prisma.goal.update({
        where: { id: goal.id },
        data: { startDate: new Date() },
        select: { startDate: true },
      });
      startDate = updated.startDate;
    }

    const label = todayLabel(tz);
    await prisma.reminderState.upsert({
      where: { userId_dateLabel: { userId: user.id, dateLabel: label } },
      create: { userId: user.id, dateLabel: label, completed: false, lastSentAt: null },
      update: { completed: false, lastSentAt: null },
    });

    return NextResponse.json({ ok: true, startDate: startDate?.toISOString(), tz, dateLabel: label, remindersPrimed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
