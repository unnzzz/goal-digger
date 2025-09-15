import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dayNumberFrom, isValidTZ, todayLabel } from "@/lib/time";

const COINS = { learn: 5, practice: 10, reflect: 5 } as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goalId = params.id;
    const { dayNumber, section, index } = await req.json();
    if (!goalId || !dayNumber || !section || typeof index !== "number") {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
    if (!goal?.startDate) return NextResponse.json({ error: "Goal not started" }, { status: 400 });

    const tz = user.tz && isValidTZ(user.tz) ? user.tz! : "America/Detroit";
    const label = todayLabel(tz);
    const todayN = dayNumberFrom(new Date(goal.startDate), label);
    
    // Allow access to next day if current day's quiz has been completed
    let maxAllowedDay = todayN;
    if (dayNumber > todayN) {
      // Check if the previous day's quiz was passed (80%+ score)
      const previousDay = dayNumber - 1;
      if (previousDay >= 1) {
        // Check if previous day's quiz was passed in the database
        try {
          const previousQuizCompletion = await prisma.quizCompletion.findFirst({
            where: { 
              userId: user.id, 
              goalId, 
              dayNumber: previousDay,
              passed: true // Only allow if quiz was passed (80%+)
            }
          });
          
          if (previousQuizCompletion && dayNumber === todayN + 1) {
            maxAllowedDay = dayNumber;
          } else {
            return NextResponse.json({ error: "You must pass the previous day's quiz (80%+) to unlock the next day" }, { status: 400 });
          }
        } catch (error) {
          // QuizCompletion table might not exist yet
          console.log('QuizCompletion table not available, checking localStorage via client');
          // For now, allow access if it's only 1 day ahead (client will handle localStorage check)
          if (dayNumber === todayN + 1) {
            maxAllowedDay = dayNumber;
          } else {
            return NextResponse.json({ error: "You cannot complete future day quests" }, { status: 400 });
          }
        }
      } else {
        return NextResponse.json({ error: "You cannot complete future day quests" }, { status: 400 });
      }
    }
    
    if (dayNumber > maxAllowedDay) return NextResponse.json({ error: "You cannot complete future day quests" }, { status: 400 });

    const exists = await prisma.questCompletion.findFirst({
      where: { userId: user.id, goalId, dayNumber, section, index },
    });
    if (exists) {
      const total = await prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } });
      return NextResponse.json({ ok: true, coinsAwarded: 0, totalCoins: total?.coins ?? 0, completionId: exists.id });
    }

    const coinsAwarded = section === "learn" ? COINS.learn : section === "practice" ? COINS.practice : COINS.reflect;

    const created = await prisma.questCompletion.create({
      data: { userId: user.id, goalId, dayNumber, section, index, coinsAwarded },
      select: { id: true },
    });

    await prisma.user.update({ where: { id: user.id }, data: { coins: { increment: coinsAwarded } } });

    // Re-check if anything remains for today across all started goals
    const remaining = await (async () => {
      const goals = await prisma.goal.findMany({
        where: { userId: user.id, NOT: { startDate: null } },
        select: { id: true, title: true, startDate: true, roadmapJson: true },
      });
      let left = 0;
      for (const g of goals) {
        const rm = g.roadmapJson as any;
        if (!rm?.days?.length) continue;
        const dn = dayNumberFrom(new Date(g.startDate!), label);
        if (dn < 1 || dn > (rm.total_days ?? rm.days.length)) continue;

        const day = rm.days.find((d: any) => d.day === dn) || rm.days[dn - 1];
        if (!day) continue;

        const comps = await prisma.questCompletion.findMany({
          where: { userId: user.id, goalId: g.id, dayNumber: dn },
          select: { section: true, index: true },
        });
        const done = (sec: "learn" | "practice" | "reflect", idx: number) => comps.some(c => c.section === sec && c.index === idx);

        for (let i = 0; i < day.learn.length; i++) if (!done("learn", i)) left++;
        for (let i = 0; i < day.practice.length; i++) if (!done("practice", i)) left++;
        if (!done("reflect", 0)) left++;
      }
      return left;
    })();

    if (remaining === 0) {
      await prisma.reminderState.upsert({
        where: { userId_dateLabel: { userId: user.id, dateLabel: label } },
        create: { userId: user.id, dateLabel: label, completed: true, lastSentAt: null },
        update: { completed: true },
      });
    }

    const totalCoins = (await prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }))?.coins ?? 0;

    return NextResponse.json({ ok: true, coinsAwarded, totalCoins, completionId: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
