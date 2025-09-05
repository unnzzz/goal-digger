export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isValidTZ(tz: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
function todayISOInTZ(tz: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}
function localDateOf(d: Date, tz: string) {
  return d.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}
function parseISODate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

// -------- GET --------
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const headerTZ = (req.headers.get("x-timezone") || "").trim();
    const tz = headerTZ && isValidTZ(headerTZ) ? headerTZ : "America/Detroit";

    const { searchParams } = new URL(req.url);
    const dateParam = (searchParams.get("date") || "").trim();
    const goalId = (searchParams.get("goalId") || "").trim();

    const whereBase: any = { userId: user.id };
    if (goalId) whereBase.goalId = goalId;

    let entries;
    if (dateParam && parseISODate(dateParam)) {
      // Pull a reasonable window, then filter by dateLabel or legacy localized date
      entries = await prisma.diaryEntry.findMany({
        where: whereBase,
        orderBy: [{ createdAt: "desc" }],
        take: 500,
        include: { goal: { select: { title: true } } },
      });
      entries = entries.filter(
        (e) => e.dateLabel === dateParam || localDateOf(e.date, tz) === dateParam
      );
    } else {
      // No specific date → latest 30
      entries = await prisma.diaryEntry.findMany({
        where: whereBase,
        orderBy: [{ createdAt: "desc" }],
        take: 30,
        include: { goal: { select: { title: true } } },
      });
    }

    const payload = entries.map((e) => ({
      id: e.id,
      goalId: e.goalId,
      goalTitle: e.goal?.title ?? "",
      type: e.type as "practice" | "reflect",
      content: e.content,
      dayNumber: e.dayNumber ?? null,
      dateUTC: e.date.toISOString(),
      dateLocal: e.dateLabel || localDateOf(e.date, tz),
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ tz, count: payload.length, entries: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// -------- POST --------
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const headerTZ = (req.headers.get("x-timezone") || "").trim();
    const tz = headerTZ && isValidTZ(headerTZ) ? headerTZ : "America/Detroit";
    const todayLabel = todayISOInTZ(tz); // YYYY-MM-DD

    const body = await req.json().catch(() => ({} as any));
    const goalId = String(body.goalId || "").trim();
    const type = String(body.type || "").trim();
    const content = String(body.content || "").trim();
    const dayNumber =
      typeof body.dayNumber === "number" && Number.isFinite(body.dayNumber) ? (body.dayNumber as number) : null;

    if (!goalId || !content || (type !== "practice" && type !== "reflect")) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id }, select: { id: true } });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    // Store now() for date (legacy), but also store the authoritative local-day label
    const created = await prisma.diaryEntry.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        type,
        content,
        dayNumber: dayNumber ?? undefined,
        // date: default(now())
        dateLabel: todayLabel,
      },
      include: { goal: { select: { title: true } } },
    });

    return NextResponse.json(
      {
        ok: true,
        tz,
        dateLocal: todayLabel,
        entry: {
          id: created.id,
          goalId: created.goalId,
          goalTitle: created.goal?.title ?? "",
          type: created.type as "practice" | "reflect",
          content: created.content,
          dayNumber: created.dayNumber ?? null,
          dateUTC: created.date.toISOString(),
          dateLocal: created.dateLabel,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
