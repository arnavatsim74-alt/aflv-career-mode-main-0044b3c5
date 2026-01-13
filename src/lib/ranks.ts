export interface RankInfo {
  name: string;
  minHours: number;
  maxHours: number | null;
}

export const RANKS: RankInfo[] = [
  { name: 'Cadet', minHours: 0, maxHours: 40 },
  { name: 'First Officer', minHours: 40, maxHours: 80 },
  { name: 'Captain', minHours: 80, maxHours: 150 },
  { name: 'Commander', minHours: 150, maxHours: 250 },
  { name: 'Vladimir', minHours: 250, maxHours: null },
];

export function getRankByHours(totalHours: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalHours >= RANKS[i].minHours) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(currentRank: RankInfo): RankInfo | null {
  const currentIndex = RANKS.findIndex(r => r.name === currentRank.name);
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  return null;
}

export function getProgressToNextRank(totalHours: number): { progress: number; hoursNeeded: number; hoursToGo: number } {
  const currentRank = getRankByHours(totalHours);
  const nextRank = getNextRank(currentRank);
  
  if (!nextRank) {
    return { progress: 100, hoursNeeded: 0, hoursToGo: 0 };
  }
  
  const hoursInCurrentTier = totalHours - currentRank.minHours;
  const hoursNeededForTier = nextRank.minHours - currentRank.minHours;
  const progress = Math.min((hoursInCurrentTier / hoursNeededForTier) * 100, 100);
  const hoursToGo = nextRank.minHours - totalHours;
  
  return { progress, hoursNeeded: nextRank.minHours, hoursToGo };
}