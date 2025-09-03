import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password) return new Response(JSON.stringify({ error:"email and password required" }), { status:400 });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return new Response(JSON.stringify({ error:"email already in use" }), { status:400 });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name: name ?? null } });
  return new Response(JSON.stringify({ id:user.id, email:user.email }), { status:201 });
}
