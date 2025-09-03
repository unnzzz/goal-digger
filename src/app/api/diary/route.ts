import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  const where: any = { userId: u!.id };
  if (date) { where.date = { gte: new Date(date+"T00:00:00"), lte: new Date(date+"T23:59:59.999") }; }
  const rows = await prisma.diaryEntry.findMany({ where, orderBy: { date:"desc" } });
  return new Response(JSON.stringify(rows));
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const { goalId, date, type, content, dayNumber } = await req.json();
  if (!date || !type || !content) return new Response("Bad Request", { status:400 });
  const entry = await prisma.diaryEntry.create({
    data: { userId: u!.id, goalId: goalId ?? null, date: new Date(date), type, content, dayNumber: dayNumber ?? null }
  });
  return new Response(JSON.stringify(entry), { status:201 });
}
