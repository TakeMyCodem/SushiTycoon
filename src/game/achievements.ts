import type { GameState } from './types';
import { STATIONS } from './config';
import { michelinRankFor } from './michelin';

/**
 * Achievementek. Nem jelvénygyűjtés: mindegyik **+3% globális bevételt** ad
 * örökre (prestige-t is túléli). Így a "mellékesen teljesített" célok is
 * érezhető erőt adnak, és a játékos önként keresi a változatos játékstílust.
 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  done: (s: GameState) => boolean;
}

/** Achievementenkénti globális bevétel-bónusz. */
export const ACHIEVEMENT_BONUS = 0.03;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_tap100', name: 'Hand-Served', desc: '100 taps', emoji: '👆', done: (s) => s.stats.taps >= 100 },
  { id: 'a_tap1000', name: 'Tireless', desc: '1,000 taps', emoji: '💪', done: (s) => s.stats.taps >= 1000 },
  { id: 'a_mgr1', name: 'First Hire', desc: 'Hire a manager', emoji: '👔', done: (s) => s.stats.managersHired >= 1 },
  { id: 'a_mgr5', name: 'Team Building', desc: '5 managers', emoji: '👥', done: (s) => STATIONS.filter((d) => s.stations[d.id].manager).length >= 5 },
  { id: 'a_mgrall', name: 'Full Crew', desc: 'Manager at every station', emoji: '🧑‍🍳', done: (s) => STATIONS.every((d) => s.stations[d.id].manager) },
  { id: 'a_unlock5', name: 'Growing Menu', desc: '5 dishes unlocked', emoji: '📜', done: (s) => STATIONS.filter((d) => s.stations[d.id].level > 0).length >= 5 },
  { id: 'a_unlockall', name: 'Full Menu', desc: 'Every dish unlocked', emoji: '🍱', done: (s) => STATIONS.every((d) => s.stations[d.id].level > 0) },
  { id: 'a_lvl100', name: 'Century Club', desc: 'Level 100 in a dish', emoji: '💯', done: (s) => STATIONS.some((d) => s.stations[d.id].level >= 100) },
  { id: 'a_lvl400', name: 'Obsessed', desc: 'Level 400 in a dish', emoji: '🏆', done: (s) => STATIONS.some((d) => s.stations[d.id].level >= 400) },
  { id: 'a_up5', name: 'Tinkerer', desc: '5 upgrades', emoji: '🔧', done: (s) => s.upgrades.length >= 5 },
  { id: 'a_up20', name: 'Perfectionist', desc: '20 upgrades', emoji: '⚙️', done: (s) => s.upgrades.length >= 20 },
  { id: 'a_vip1', name: 'Nice Guest', desc: 'Catch a VIP', emoji: '🎩', done: (s) => s.stats.vipCaught >= 1 },
  { id: 'a_vip25', name: 'VIP Host', desc: '25 VIP guests', emoji: '🥂', done: (s) => s.stats.vipCaught >= 25 },
  { id: 'a_abil10', name: 'Tactician', desc: '10 abilities used', emoji: '🎯', done: (s) => s.stats.abilitiesUsed >= 10 },
  { id: 'a_abil50', name: 'Conductor', desc: '50 abilities used', emoji: '🎼', done: (s) => s.stats.abilitiesUsed >= 50 },
  { id: 'a_rush5', name: 'Rush Regular', desc: '5 rush hours', emoji: '⏰', done: (s) => s.stats.rushesSeen >= 5 },
  { id: 'a_star1', name: 'First Star', desc: 'Open a new restaurant', emoji: '⭐', done: (s) => s.stats.prestiges >= 1 },
  { id: 'a_star100', name: 'Stargazer', desc: '100 stars total', emoji: '🌟', done: (s) => s.stars + s.starsSpent >= 100 },
  { id: 'a_chef3', name: 'Small Crew', desc: '3 chefs collected', emoji: '👨‍🍳', done: (s) => Object.values(s.chefs).filter((c) => c.level > 0).length >= 3 },
  { id: 'a_chef8', name: 'Head Chef', desc: '8 chefs collected', emoji: '🍳', done: (s) => Object.values(s.chefs).filter((c) => c.level > 0).length >= 8 },
  { id: 'a_chef_max', name: 'Master Class', desc: 'A chef at max level', emoji: '🎓', done: (s) => Object.values(s.chefs).some((c) => c.level >= 5) },
  { id: 'a_rep75', name: 'Well-Reviewed', desc: '75 reputation', emoji: '🌸', done: (s) => s.reputation >= 75 },
  { id: 'a_rep95', name: 'Town Favorite', desc: '95 reputation', emoji: '💮', done: (s) => s.reputation >= 95 },
  { id: 'a_contract', name: 'Supply Chain', desc: '3 supplier contracts', emoji: '📦', done: (s) => s.contracts.length >= 3 },
  { id: 'a_shift1', name: 'Filling In', desc: 'Complete a shift', emoji: '🧑‍🍳', done: (s) => s.stats.shiftsPlayed >= 1 },
  { id: 'a_shift10', name: 'Regular Staff', desc: '10 shifts', emoji: '📋', done: (s) => s.stats.shiftsPlayed >= 10 },
  { id: 'a_served250', name: 'Busy Counter', desc: '250 customers served', emoji: '🍽️', done: (s) => s.stats.customersServed >= 250 },
  { id: 'a_shift80', name: 'Shift Champion', desc: '80 points in a shift', emoji: '🏅', done: (s) => s.bestShift >= 80 },
  { id: 'a_perk', name: 'Investor', desc: 'Buy a star perk', emoji: '💎', done: (s) => Object.values(s.perks).some((v) => v > 0) },
  { id: 'a_daily7', name: 'Dedicated', desc: '7-day streak', emoji: '📅', done: (s) => s.dailyStreak >= 7 },
  { id: 'a_league_gold', name: 'League Contender', desc: 'Reach the Gold division', emoji: '🥇', done: (s) => s.league.division >= 2 },
  { id: 'a_league_diamond', name: 'League Champion', desc: 'Reach the Diamond division', emoji: '👑', done: (s) => s.league.division >= 4 },
  { id: 'a_michelin1', name: 'Rising Star', desc: 'Earn your first Michelin star', emoji: '⭐', done: (s) => michelinRankFor(s.stars + s.starsSpent, s.stats.prestiges).id >= 1 },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<string, AchievementDef>;
