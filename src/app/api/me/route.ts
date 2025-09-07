import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { primaryStatus, unlockedStatuses } from "@/lib/status";

export async function GET() {
  const s = await getServerSession(authOptions);
  if(!s?.user?.email) return NextResponse.json({error:"Unauthorized"},{status:401});
  const u = await prisma.user.findUnique({
    where: { email: s.user.email },
    select: { name:true, email:true, coins:true, avatarKey:true, statINT:true, statSTR:true, statVIT:true, statAES:true, statWLH:true }
  });
  if(!u) return NextResponse.json({error:"Unauthorized"},{status:401});
  const stats = { INT:u.statINT, STR:u.statSTR, VIT:u.statVIT, AES:u.statAES, WLH:u.statWLH };
  const primary = primaryStatus(stats);
  const badges = unlockedStatuses(stats).slice(0,3).map(s=>({key:s.key,label:s.label}));
  return NextResponse.json({ ...u, stats, primaryStatus: primary?.label??null, badges });
}
