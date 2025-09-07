// src/lib/shopLogic.ts
import type { ShopItem, ItemCategory, UserItem } from "@prisma/client";

export type Stats = { INT:number; STR:number; VIT:number; AES:number; WLH:number };

export const CATEGORY_PRIMARY = {
  NERDY: "INT" as keyof Stats,
  FITNESS: "STR" as keyof Stats,
  GREENTHUMB: "VIT" as keyof Stats,
  CREATIVE: "AES" as keyof Stats,
  COZY: "VIT" as keyof Stats,
  LUXURY: "WLH" as keyof Stats,
  MINIMALIST: "AES" as keyof Stats,
  VINTAGE: "AES" as keyof Stats,
} as const;

// Simplified tier curve from cost: 1..3 (easier progression)
export function itemTierByCost(cost: number) {
  if (cost <= 50) return 1;
  if (cost <= 150) return 2;
  return 3;
}

// Category level: DISABLED (only use explicit stats)
export function categoryLevels(owned: Array<UserItem & { item: ShopItem }>) {
  // Disable category level unlocking - only use explicit stat requirements
  return {
    NERDY: 999, FITNESS: 999, GREENTHUMB: 999, 
    CREATIVE: 999, COZY: 999, LUXURY: 999, 
    MINIMALIST: 999, VINTAGE: 999,
  };
}

// Global progress score (very simple & readable)
export function globalProgress(stats: Stats) {
  return stats.INT + stats.STR + stats.VIT + stats.AES + stats.WLH;
}

// Tier gates for global path - DISABLED (only use explicit stats)
export function globalRequiredForTier(tier: number) {
  // Disable global unlocking - only use explicit stat requirements
  return 999999; // Impossible to reach
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
  // Only use explicit stat requirements - no category or global unlocking
  const unlockable = meetsExplicitReqs(stats, it, statusOK);

  // Reasons to show if locked
  const reasons: string[] = [];
  if (!unlockable) {
    // Only show stat requirements
    if (stats.INT < it.reqINT) reasons.push(`INT ≥ ${it.reqINT}`);
    if (stats.STR < it.reqSTR) reasons.push(`STR ≥ ${it.reqSTR}`);
    if (stats.VIT < it.reqVIT) reasons.push(`VIT ≥ ${it.reqVIT}`);
    if (stats.AES < it.reqAES) reasons.push(`AES ≥ ${it.reqAES}`);
    if (stats.WLH < it.reqWLH) reasons.push(`WLH ≥ ${it.reqWLH}`);
    if (it.reqStatus) reasons.push(`Status: ${it.reqStatus}`);
  }

  return { unlockable, reasons };
}

// Small bonus per purchase: primary stat of the category +1
export function primaryBonusForCategory(cat: ItemCategory): Partial<Stats> {
  const k = CATEGORY_PRIMARY[cat];
  return { [k]: 1 } as Partial<Stats>;
}

// Wealth bonus from cost (only for expensive items)
export function wealthBonusFromCost(cost: number) {
  return cost >= 100 ? Math.round(cost / 20) : 0; // Only items 100+ coins get wealth bonus
}
