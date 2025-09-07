import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goalId = params.id;
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goal = await prisma.goal.findFirst({ 
      where: { id: goalId, userId: user.id },
      select: { id: true, title: true, totalDays: true, roadmapJson: true, startDate: true }
    });
    
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    if (!goal.startDate) return NextResponse.json({ error: "Goal not started" }, { status: 400 });

    const roadmap = goal.roadmapJson as any;
    if (!roadmap?.days || !Array.isArray(roadmap.days)) {
      return NextResponse.json({ error: "Invalid roadmap" }, { status: 400 });
    }

    // Calculate total quests across all days
    let totalQuests = 0;
    for (const day of roadmap.days) {
      if (day.learn) totalQuests += day.learn.length;
      if (day.practice) totalQuests += day.practice.length;
      if (day.reflect) totalQuests += 1; // Each day has 1 reflect quest
    }

    // Get all quest completions for this goal
    const completions = await prisma.questCompletion.findMany({
      where: { userId: user.id, goalId: goal.id },
      select: { dayNumber: true, section: true, index: true }
    });

    // Count completed quests
    const completedQuests = completions.length;

    // Calculate percentage
    const percentage = totalQuests > 0 ? Math.min(100, Math.round((completedQuests / totalQuests) * 100)) : 0;

    return NextResponse.json({
      totalQuests,
      completedQuests,
      percentage,
      totalDays: goal.totalDays
    });

  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
