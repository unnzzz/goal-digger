import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { meetsStatus } from "@/lib/status"; // you already have this
import {
  unlockCheck,
} from "@/lib/shopLogic";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { email: s.user.email },
    select: {
      id: true,
      coins: true,
      statINT: true,
      statSTR: true,
      statVIT: true,
      statAES: true,
      statWLH: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = { INT: u.statINT, STR: u.statSTR, VIT: u.statVIT, AES: u.statAES, WLH: u.statWLH };

  const owned = await prisma.userItem.findMany({
    where: { userId: u.id },
    include: { item: true },
  });
  const ownedSet = new Set(owned.map((x) => x.itemId));

  const items = await prisma.shopItem.findMany({
    orderBy: { cost: "asc" },
  });

  const out = items.map((it) => {
    const statusOK = meetsStatus(stats, it.reqStatus);
    const { unlockable, reasons } = unlockCheck(stats, owned, it, statusOK);
    return {
      id: it.id,
      name: it.name,
      cost: it.cost,
      boosts: { INT: it.intBoost, STR: it.strBoost, VIT: it.vitBoost, AES: it.aesBoost, WLH: it.wlhBoost },
      owned: ownedSet.has(it.id),
      locked: !unlockable,
      reasons,
    };
  });

  return NextResponse.json({ coins: u.coins, items: out });
}
