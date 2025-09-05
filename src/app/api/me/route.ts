import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return new Response(
    JSON.stringify({
      ok: true,
      name: user?.name ?? null,
      email: user?.email ?? session.user.email,
      coins: user?.coins ?? 0,
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
