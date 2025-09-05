// src/lib/shopLogic.ts
import type { ShopItem, ItemCategory, UserItem } from "@prisma/client";

export type Stats = { INT:number; STR:number; VIT:number; AES:number; WLH:number };

export const CATEGORY_PRIMARY: Record<ItemCategory, keyof Stats> = {
  NERDY: "INT",
  FITNESS: "STR",
  GREENTHUMB: "VIT",
};

// Simple tier curve from cost: 1..5
export function itemTierByCost(cost: number) {
  if (cost <= 120) return 1;
  if (cost <= 220) return 2;
  if (cost <= 320) return 3;
  if (cost <= 420) return 4;
  return 5;
}

// Category level: every 3 owned items in a category = +1 level, starts at 1
export function categoryLevels(owned: Array<UserItem & { item: ShopItem }>) {
  const counts = { NERDY: 0, FITNESS: 0, GREENTHUMB: 0 } as Record<ItemCategory, number>;
  for (const o of owned) counts[o.item.category]++;
  return {
    NERDY: 1 + Math.floor(counts.NERDY / 3),
    FITNESS: 1 + Math.floor(counts.FITNESS / 3),
    GREENTHUMB: 1 + Math.floor(counts.GREENTHUMB / 3),
  };
}

// Global progress score (very simple & readable)
export function globalProgress(stats: Stats) {
  return stats.INT + stats.STR + stats.VIT + stats.AES + stats.WLH;
}

// Tier gates for global path
export function globalRequiredForTier(tier: number) {
  // gentle ramp:  Tier1:  15, Tier2: 45, Tier3: 90, Tier4: 150, Tier5: 225
  const thresholds = [0, 15, 45, 90, 150, 225];
  return thresholds[Math.max(0, Math.min(tier, thresholds.length - 1))];
}

// Does user meet explicit reqs (old path)?
export function meetsExplicitReqs(stats: Stats, it: ShopItem, statusOK: boolean) {
  const okStats =
    stats.INT >= it.reqINT &&
    stats.STR >= it.reqSTR &&
    stats.VIT >= it.reqVIT &&
    stats.AES >= it.reqAES &&
    stats.WLH >= it.reqWLH;
  return okStats && statusOK;
}

export function unlockCheck(
  stats: Stats,
  owned: Array<UserItem & { item: ShopItem }>,
  it: ShopItem,
  statusOK: boolean
) {
  const tier = itemTierByCost(it.cost);
  const cats = categoryLevels(owned);
  const catLevel = cats[it.category];
  const gScore = globalProgress(stats);

  const explicit = meetsExplicitReqs(stats, it, statusOK);
  const byCategory = catLevel >= tier;
  const byGlobal = gScore >= globalRequiredForTier(tier);

  const unlockable = explicit || byCategory || byGlobal;

  // Reasons to show if locked
  const reasons: string[] = [];
  if (!unlockable) {
    // compute deltas for guidance
    if (stats.INT < it.reqINT) reasons.push(`INT ≥ ${it.reqINT}`);
    if (stats.STR < it.reqSTR) reasons.push(`STR ≥ ${it.reqSTR}`);
    if (stats.VIT < it.reqVIT) reasons.push(`VIT ≥ ${it.reqVIT}`);
    if (stats.AES < it.reqAES) reasons.push(`AES ≥ ${it.reqAES}`);
    if (stats.WLH < it.reqWLH) reasons.push(`WLH ≥ ${it.reqWLH}`);
    if (it.reqStatus) reasons.push(`Status: ${it.reqStatus}`);

    if (catLevel < tier) reasons.push(`${it.category} Level ≥ ${tier}`);
    const needG = globalRequiredForTier(tier);
    if (gScore < needG) reasons.push(`Total Stats ≥ ${needG}`);
  }

  return { unlockable, reasons };
}

// Small bonus per purchase: primary stat of the category +1
export function primaryBonusForCategory(cat: ItemCategory): Partial<Stats> {
  const k = CATEGORY_PRIMARY[cat];
  return { [k]: 1 } as Partial<Stats>;
}

// Wealth bonus from cost
export function wealthBonusFromCost(cost: number) {
  return Math.max(1, Math.round(cost / 20)); // e.g., cost 120 -> +6 WLH
}
