import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const goals = await prisma.goal.findMany({ where: { userId: u!.id }, orderBy: { createdAt:"desc" } });
  return new Response(JSON.stringify(goals));
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const { title, dailyMinutes, totalDays, roadmap } = await req.json();
  if (!title || !dailyMinutes || !totalDays || !roadmap) return new Response("Bad Request",{status:400});
  const goal = await prisma.goal.create({ data: { userId: u!.id, title, dailyMinutes, totalDays, roadmapJson: roadmap } });
  return new Response(JSON.stringify(goal), { status:201 });
}
