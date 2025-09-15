export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayNumberFrom, isValidTZ, localNowParts, todayLabel } from "@/lib/time";
import { sendReminderEmail, RemainingItem } from "@/lib/reminderEmail";

const TWO_HOURS = 2 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { goals: { some: {} } },
    select: { id: true, email: true, tz: true },
  });

  let checked = 0, sent = 0, completedMarked = 0;

  for (const u of users) {
    checked++;
    const tz = (u.tz && isValidTZ(u.tz)) ? u.tz! : "America/Detroit";

    const now = localNowParts(tz);
    const label = now.label;
    const after8am = now.h > 8 || (now.h === 8 && now.min >= 0);

    const remaining = await remainingItemsForUserDay(u.id, label, tz);
    if (remaining.length === 0) {
      const st = await prisma.reminderState.upsert({
        where: { userId_dateLabel: { userId: u.id, dateLabel: label } },
        create: { userId: u.id, dateLabel: label, completed: true, lastSentAt: null },
        update: { completed: true },
      });
      if (!st.completed) completedMarked++;
      continue;
    }

    if (!after8am) continue;

    const state = await prisma.reminderState.upsert({
      where: { userId_dateLabel: { userId: u.id, dateLabel: label } },
      create: { userId: u.id, dateLabel: label, completed: false, lastSentAt: null },
      update: {},
    });

    const nowUTC = Date.now();
    const last = state.lastSentAt ? state.lastSentAt.getTime() : null;
    const shouldSend = last === null || (nowUTC - last) >= TWO_HOURS;
    if (!shouldSend) continue;

    try {
      await sendReminderEmail(u.email, label, remaining);
      await prisma.reminderState.update({
        where: { userId_dateLabel: { userId: u.id, dateLabel: label } },
        data: { lastSentAt: new Date() },
      });
      sent++;
    } catch {
      // swallow email errors
    }
  }

  return NextResponse.json({ ok: true, checked, sent, completedMarked }, { headers: { "Cache-Control": "no-store" } });
}

async function remainingItemsForUserDay(userId: string, dateLabel: string, tz: string): Promise<RemainingItem[]> {
  const goals = await prisma.goal.findMany({
    where: { userId, NOT: { startDate: null } },
    select: { id: true, title: true, startDate: true, roadmapJson: true },
  });

  const items: RemainingItem[] = [];
  for (const g of goals) {
    const rm = g.roadmapJson as any;
    if (!rm?.days?.length) continue;

    const dn = dayNumberFrom(new Date(g.startDate!), dateLabel);
    if (dn < 1 || dn > (rm.total_days ?? rm.days.length)) continue;

    const day = rm.days.find((d: any) => d.day === dn) || rm.days[dn - 1];
    if (!day) continue;

    const comps = await prisma.questCompletion.findMany({
      where: { userId, goalId: g.id, dayNumber: dn },
      select: { section: true, index: true },
    });
    const done = (s: "learn" | "practice" | "reflect", i: number) => comps.some(c => c.section === s && c.index === i);

    for (let i = 0; i < day.learn.length; i++) if (!done("learn", i))
      items.push({ goalTitle: g.title, dayNumber: dn, section: "learn", index: i, title: day.learn[i]?.title, url: day.learn[i]?.url });
    for (let i = 0; i < day.practice.length; i++) if (!done("practice", i))
      items.push({ goalTitle: g.title, dayNumber: dn, section: "practice", index: i, title: day.practice[i]?.title, url: day.practice[i]?.url });
    if (!done("reflect", 0))
      items.push({ goalTitle: g.title, dayNumber: dn, section: "reflect", index: 0, title: "Reflection" });
    
    // Add quiz if it exists and is not completed
    if (day.quiz && day.quiz.length > 0) {
      const quizCompletions = await prisma.quizCompletion.findMany({
        where: { userId, goalId: g.id, dayNumber: dn },
        select: { passed: true },
      });
      const isQuizCompleted = quizCompletions.length > 0; // Quiz is completed if any attempt was made
      if (!isQuizCompleted) {
        items.push({ goalTitle: g.title, dayNumber: dn, section: "quiz", index: 0, title: `Quiz: Day ${dn}` });
      }
    }
  }

  items.sort((a, b) =>
    a.goalTitle.localeCompare(b.goalTitle) ||
    a.dayNumber - b.dayNumber ||
    rank(a.section) - rank(b.section) ||
    a.index - b.index
  );
  return items;
}
function rank(s: "learn" | "practice" | "reflect" | "quiz") { 
  return s === "learn" ? 0 : s === "practice" ? 1 : s === "reflect" ? 2 : 3; 
}


