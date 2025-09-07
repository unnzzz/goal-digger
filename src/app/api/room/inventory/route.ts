import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(){
  const s = await getServerSession(authOptions);
  if(!s?.user?.email) return NextResponse.json({error:"Unauthorized"},{status:401});
  const u = await prisma.user.findUnique({ where:{ email:s.user.email }, select:{ id:true }});
  if(!u) return NextResponse.json({error:"Unauthorized"},{status:401});

  const items = await prisma.userItem.findMany({
    where:{ userId: u.id },
    include:{ item:true }
  });

  return NextResponse.json({ items: items.map(x=>({
    id:x.id,
    placed:x.placed, posX:x.posX, posY:x.posY,
    rotation:x.rotation, scale:x.scale,
    item:{ id:x.item.id, name:x.item.name, cost:x.item.cost, category:x.item.category }
  }))});
}
