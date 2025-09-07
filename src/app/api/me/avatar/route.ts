import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED = new Set(["cat","dog","duck","elephant","lion","monkey","owl","penguin","rabbit"]);

export async function POST(req: NextRequest){
  const s = await getServerSession(authOptions);
  if(!s?.user?.email) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { avatarKey } = await req.json().catch(()=>({}));
  if(!ALLOWED.has(avatarKey)) return NextResponse.json({error:"Invalid avatar"},{status:400});
  await prisma.user.update({ where:{ email:s.user.email }, data:{ avatarKey }});
  return NextResponse.json({ ok:true, avatarKey });
}
