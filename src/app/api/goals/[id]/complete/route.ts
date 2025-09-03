import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const COINS = { learn: 5, practice: 10, reflect: 5 } as const;

export async function POST(req: Request, { params }: { params: { id:string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return new Response("Unauthorized", { status:401 });
  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  const { dayNumber, section, index } = await req.json();
  const coins = COINS[section as keyof typeof COINS] ?? 0;
  const completion = await prisma.questCompletion.create({
    data: { userId: u!.id, goalId: params.id, dayNumber, section, index, coinsAwarded: coins }
  });
  await prisma.user.update({ where: { id: u!.id }, data: { coins: { increment: coins } } });
  return new Response(JSON.stringify({ completion }), { status:201 });
}
