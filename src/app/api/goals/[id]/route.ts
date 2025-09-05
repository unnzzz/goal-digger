import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id:string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  if (!u) return new Response("Unauthorized", { status:401 });

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId: u.id } });
  if (!goal) return new Response("Not found", { status:404 });

  const completions = await prisma.questCompletion.findMany({
    where: { userId: u.id, goalId: goal.id },
    select: { dayNumber: true, section: true, index: true },
  });

  return new Response(JSON.stringify({ goal, completions }), { headers: { "Content-Type":"application/json" } });
}

export async function PUT(req: Request, { params }: { params: { id:string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const { title, roadmap } = await req.json();
  const goal = await prisma.goal.update({ where: { id: params.id }, data: { title, roadmapJson: roadmap } });
  return new Response(JSON.stringify(goal));
}

export async function DELETE(_: Request, { params }: { params: { id:string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  await prisma.goal.delete({ where: { id: params.id } });
  return new Response(null, { status:204 });
}
