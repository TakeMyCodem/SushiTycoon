/**
 * Csillag-perkek — a meta-réteg.
 *
 * A csillagot elköltheted perkre, DE az elköltött csillag már nem ad
 * +3% bevételt. Ez valódi döntés minden prestige-nél: nyers szorzó,
 * vagy kényelem és hosszú távú előny?
 */
export interface PerkDef {
  id: string;
  name: string;
  desc: (lvl: number) => string;
  emoji: string;
  maxLevel: number;
  /** Az adott szint ára csillagban. */
  cost: (lvl: number) => number;
}

export const PERKS: PerkDef[] = [
  {
    id: 'offline',
    name: 'Night Shift',
    emoji: '🌙',
    maxLevel: 6,
    desc: (l) => `Offline income cap: ${2 + l} hours`,
    cost: (l) => 5 * Math.pow(2, l),
  },
  {
    id: 'head_start',
    name: 'Legacy',
    emoji: '💼',
    maxLevel: 5,
    desc: (l) => `After prestige, ${l <= 1 ? 'the first dish' : `the first ${l} dishes`} start at level 25`,
    cost: (l) => 8 * Math.pow(2, l),
  },
  {
    id: 'golden_touch',
    name: 'Golden Touch',
    emoji: '✨',
    maxLevel: 10,
    desc: (l) => `All income +${l * 10}%`,
    cost: (l) => 6 * Math.pow(1.8, l),
  },
  {
    id: 'manager_deal',
    name: 'Headhunter',
    emoji: '👔',
    maxLevel: 4,
    desc: (l) => `Managers are ${l * 15}% cheaper`,
    cost: (l) => 10 * Math.pow(2, l),
  },
  {
    id: 'ad_master',
    name: 'Ad Star',
    emoji: '📺',
    maxLevel: 4,
    desc: (l) => `All boosts last ${l * 25}% longer`,
    cost: (l) => 7 * Math.pow(2, l),
  },
  {
    id: 'vip_magnet',
    name: 'Regulars',
    emoji: '🎩',
    maxLevel: 5,
    desc: (l) => `VIP guests arrive ${l * 20}% more often and bring more`,
    cost: (l) => 9 * Math.pow(1.9, l),
  },
  {
    id: 'quick_hands',
    name: 'Quick Hands',
    emoji: '⚡',
    maxLevel: 5,
    desc: (l) => `All ability cooldowns are ${l * 10}% faster`,
    cost: (l) => 8 * Math.pow(1.9, l),
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p])) as Record<string, PerkDef>;

export function perkLevel(perks: Record<string, number>, id: string): number {
  return perks[id] ?? 0;
}

/** A következő szint ára, vagy null ha maxon van. */
export function perkNextCost(perks: Record<string, number>, def: PerkDef): number | null {
  const lvl = perkLevel(perks, def.id);
  return lvl >= def.maxLevel ? null : Math.ceil(def.cost(lvl));
}
