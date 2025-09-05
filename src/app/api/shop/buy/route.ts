import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { meetsStatus } from "@/lib/status";
import {
  unlockCheck,
  primaryBonusForCategory,
  wealthBonusFromCost,
} from "@/lib/shopLogic";

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await req.json().catch(() => ({}));
  if (!itemId) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const u = await prisma.user.findUnique({ where: { email: s.user.email } });
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const it = await prisma.shopItem.findUnique({ where: { id: itemId } });
  if (!it) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const already = await prisma.userItem.findUnique({
    where: { userId_itemId: { userId: u.id, itemId: it.id } },
  }).catch(() => null);
  if (already) return NextResponse.json({ error: "Already owned" }, { status: 400 });

  const stats = { INT: u.statINT, STR: u.statSTR, VIT: u.statVIT, AES: u.statAES, WLH: u.statWLH };

  // For the unlock check we also need currently owned items with item included
  const owned = await prisma.userItem.findMany({
    where: { userId: u.id },
    include: { item: true },
  });

  const statusOK = meetsStatus(stats, it.reqStatus);
  const gate = unlockCheck(stats, owned, it, statusOK);
  if (!gate.unlockable) {
    return NextResponse.json({ error: "Locked", reasons: gate.reasons }, { status: 400 });
  }

  if (u.coins < it.cost) return NextResponse.json({ error: "Not enough coins" }, { status: 400 });

  const wealthBonus = wealthBonusFromCost(it.cost);
  const primaryBonus = primaryBonusForCategory(it.category);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: u.id },
      data: {
        coins: { decrement: it.cost },

        statINT: { increment: it.intBoost + (primaryBonus.INT ?? 0) },
        statSTR: { increment: it.strBoost + (primaryBonus.STR ?? 0) },
        statVIT: { increment: it.vitBoost + (primaryBonus.VIT ?? 0) },
        statAES: { increment: it.aesBoost + (primaryBonus.AES ?? 0) },
        statWLH: { increment: it.wlhBoost + wealthBonus + (primaryBonus.WLH ?? 0) },
      },
    });

    await tx.userItem.create({ data: { userId: u.id, itemId: it.id } });

    const nu = await tx.user.findUnique({
      where: { id: u.id },
      select: { coins: true, statINT: true, statSTR: true, statVIT: true, statAES: true, statWLH: true },
    });
    return nu!;
  });

  return NextResponse.json({
    ok: true,
    coins: updated.coins,
    stats: {
      INT: updated.statINT,
      STR: updated.statSTR,
      VIT: updated.statVIT,
      AES: updated.statAES,
      WLH: updated.statWLH,
    },
  });
}
