/**
 * Manager-képességek — az aktív játék magja.
 *
 * Ettől lesz a játék több egy clickernél: nem az számít, hányat kattintasz,
 * hanem hogy MIKOR sütöd el a képességeket. A jó játékos a csúcsforgalomra
 * időzíti a szorzókat, és összeláncolja őket — ugyanaz az idő alatt
 * többszörös bevétel jön ki. Ez skill, nem grind.
 */
export interface AbilityDef {
  id: string;
  /** Melyik állomás managerével nyílik meg. */
  stationId: string;
  name: string;
  /** Rövid címke a képességsávra — a teljes név nem fér ki egy 60px-es gombra. */
  short: string;
  desc: string;
  emoji: string;
  cooldownMs: number;
  effect:
    | { kind: 'income'; mult: number; ms: number }
    | { kind: 'speed'; mult: number; ms: number }
    | { kind: 'cash'; seconds: number };
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'yuki_hands',
    stationId: 'maki',
    name: 'Lightning Hands',
    short: 'Lightning',
    desc: 'All income x2 for 30 seconds',
    emoji: '💨',
    cooldownMs: 5 * 60_000,
    effect: { kind: 'income', mult: 2, ms: 30_000 },
  },
  {
    id: 'hiro_special',
    stationId: 'nigiri',
    name: "Chef's Special",
    short: 'Special',
    desc: 'Instantly gain 10 minutes of income',
    emoji: '🍱',
    cooldownMs: 9 * 60_000,
    effect: { kind: 'cash', seconds: 600 },
  },
  {
    id: 'aiko_blade',
    stationId: 'sashimi',
    name: 'Blade Master',
    short: 'Blade',
    desc: 'Every cycle takes half as long for 45 seconds',
    emoji: '🔪',
    cooldownMs: 8 * 60_000,
    effect: { kind: 'speed', mult: 2, ms: 45_000 },
  },
  {
    id: 'kenji_feast',
    stationId: 'uramaki',
    name: 'Feast',
    short: 'Feast',
    desc: 'All income x3 for 60 seconds',
    emoji: '🎉',
    cooldownMs: 15 * 60_000,
    effect: { kind: 'income', mult: 3, ms: 60_000 },
  },
  {
    id: 'mei_rush',
    stationId: 'temaki',
    name: 'Courier Rush',
    short: 'Courier',
    desc: 'Instantly gain 30 minutes of income',
    emoji: '🛵',
    cooldownMs: 20 * 60_000,
    effect: { kind: 'cash', seconds: 1800 },
  },
  {
    id: 'ren_fire',
    stationId: 'tempura',
    name: 'Wok Fire',
    short: 'Fire',
    desc: 'All income x4 for 90 seconds',
    emoji: '🔥',
    cooldownMs: 25 * 60_000,
    effect: { kind: 'income', mult: 4, ms: 90_000 },
  },
];

export const ABILITY_BY_STATION = Object.fromEntries(
  ABILITIES.map((a) => [a.stationId, a]),
) as Record<string, AbilityDef>;
