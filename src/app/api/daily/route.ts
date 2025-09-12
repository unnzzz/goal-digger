export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SplitT = { total_parts: number; part_number: number; range?: string | null } | null;

type Resource = {
  kind: "watch" | "listen" | "read";
  title: string;
  url: string;
  source: string | null;
  duration_minutes: number | null;
  split: SplitT;
};

type Day = {
  day: number;
  title: string;
  minutes: number;
  learn: Resource[];
  practice: Resource[];
  reflect: string;
  quiz?: any[];
};

type RoadmapT = {
  goal: string;
  total_days: number;
  daily_minutes: number;
  days: Day[];
};

type DailyItem = {
  goalId: string;
  goalTitle: string;
  dayNumber: number;
  section: "learn" | "practice" | "reflect" | "quiz";
  index: number;
  kind?: "watch" | "listen" | "read";
  title?: string;
  url?: string;
  duration_minutes?: number | null;
  split?: SplitT;
  reflectText?: string;
  completed?: boolean;
  quizData?: any[];
};

function isValidTZ(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function todayISOInTZ(tz: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

function parseISODate(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function epochDayUTC(y: number, m: number, d: number) {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function dayNumberFrom(startDate: Date, targetISO: string): number {
  const parts = parseISODate(targetISO);
  if (!parts) return 1;
  const s = startDate;
  const sy = s.getUTCFullYear();
  const sm = s.getUTCMonth() + 1;
  const sd = s.getUTCDate();
  const startED = epochDayUTC(sy, sm, sd);
  const targetED = epochDayUTC(parts.y, parts.m, parts.d);
  return Math.max(1, targetED - startED + 1);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return new Response("Unauthorized", { status: 401 });

    // Get and validate timezone from header
    const headerTZ = (req.headers.get("x-timezone") || "").trim();
    const tz = headerTZ && isValidTZ(headerTZ) ? headerTZ : "America/Detroit";

    // Always “today” in client’s TZ
    const todayISO = todayISOInTZ(tz);

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, startDate: true, roadmapJson: true },
      orderBy: { createdAt: "asc" },
    });

    const items: DailyItem[] = [];

    for (const g of goals) {
      if (!g.startDate) continue;

      const rm = g.roadmapJson as unknown as RoadmapT | null;
      if (!rm || !Array.isArray(rm.days) || !rm.total_days) continue;

      const dn = dayNumberFrom(new Date(g.startDate), todayISO);
      if (dn < 1 || dn > rm.total_days) continue;

      const day = rm.days.find((d) => d.day === dn) || rm.days[dn - 1];
      if (!day) continue;

      const completions = await prisma.questCompletion.findMany({
        where: { userId: user.id, goalId: g.id, dayNumber: dn },
        select: { section: true, index: true },
      });

      // Try to get quiz completions, but handle case where table doesn't exist yet
      let quizCompletions: any[] = [];
      try {
        quizCompletions = await prisma.quizCompletion.findMany({
          where: { userId: user.id, goalId: g.id, dayNumber: dn },
          select: { passed: true },
        });
      } catch (error) {
        // QuizCompletion table might not exist yet, use empty array
        console.log('QuizCompletion table not available yet, using empty array');
        quizCompletions = [];
      }

      const isCompleted = (section: "learn" | "practice" | "reflect", index: number) =>
        completions.some((c) => c.section === section && c.index === index);

      const isQuizCompleted = () =>
        quizCompletions.some((qc) => qc.passed);

      day.learn.forEach((r, i) => {
        items.push({
          goalId: g.id,
          goalTitle: g.title,
          dayNumber: dn,
          section: "learn",
          index: i,
          kind: r.kind,
          title: r.title,
          url: r.url,
          duration_minutes: r.duration_minutes ?? null,
          split: r.split ?? null,
          completed: isCompleted("learn", i),
        });
      });

      day.practice.forEach((r, i) => {
        items.push({
          goalId: g.id,
          goalTitle: g.title,
          dayNumber: dn,
          section: "practice",
          index: i,
          kind: r.kind,
          title: r.title,
          url: r.url,
          duration_minutes: r.duration_minutes ?? null,
          split: r.split ?? null,
          completed: isCompleted("practice", i),
        });
      });

      items.push({
        goalId: g.id,
        goalTitle: g.title,
        dayNumber: dn,
        section: "reflect",
        index: 0,
        reflectText: day.reflect,
        completed: isCompleted("reflect", 0),
      });

      // Add quiz item if quiz exists for this day
      if (day.quiz && day.quiz.length > 0) {
        items.push({
          goalId: g.id,
          goalTitle: g.title,
          dayNumber: dn,
          section: "quiz",
          index: 0,
          title: `Quiz: Day ${dn}`,
          completed: isQuizCompleted(),
          quizData: day.quiz,
        });
      }
    }

    return new Response(JSON.stringify({ date: todayISO, items, tz }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "daily error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
