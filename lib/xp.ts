/** XP threshold to reach the given level (1-indexed). Level 1 = 0 XP. */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(80 * Math.pow(level - 1, 1.85));
}

export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

export function xpIntoCurrentLevel(totalXp: number): {
  level: number;
  current: number;
  nextLevelTotal: number;
} {
  const level = levelFromTotalXp(totalXp);
  const floor = xpThresholdForLevel(level);
  const ceiling = xpThresholdForLevel(level + 1);
  return {
    level,
    current: totalXp - floor,
    nextLevelTotal: Math.max(1, ceiling - floor),
  };
}
