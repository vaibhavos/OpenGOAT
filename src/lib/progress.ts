import type { Goal } from '../types/goal.js';
import type { GapEntry } from '../types/gap.js';

export interface ProgressSnapshot {
  gapRemaining: number;
  closedPercent: number;
  velocity7d: number;
  targetVelocity: number;
  weeksRemaining: number;
  projectedDate: string;
  velocityLabel: string;
}

export function calculateProgress(goal: Goal, history: GapEntry[], currentValue: number = goal.currentVal, now: number = Date.now()): ProgressSnapshot {
  const gapRemaining = goal.targetVal - currentValue;
  const closedPercent = goal.targetVal > 0 ? Number(((currentValue / goal.targetVal) * 100).toFixed(1)) : 0;

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentHistory = history.filter((entry) => entry.loggedAt.getTime() > sevenDaysAgo);

  let velocity7d = 0;
  let velocityLabel = '0.0/week (not enough data)';

  if (recentHistory.length >= 2) {
    const oldest = recentHistory[0];
    const daysDiff = Math.max(1, (now - oldest.loggedAt.getTime()) / (1000 * 60 * 60 * 24));
    velocity7d = ((currentValue - oldest.value) / daysDiff) * 7;
    velocityLabel = `${velocity7d.toFixed(1)}/week (7-day average)`;
  } else if (history.length >= 2) {
    const oldest = history[0];
    const daysDiff = Math.max(1, (now - oldest.loggedAt.getTime()) / (1000 * 60 * 60 * 24));
    velocity7d = ((currentValue - oldest.value) / daysDiff) * 7;
    velocityLabel = `${velocity7d.toFixed(1)}/week (all-time average)`;
  }

  const weeksRemaining = Math.max(1, (new Date(goal.deadline).getTime() - now) / (1000 * 60 * 60 * 24 * 7));
  const targetVelocity = weeksRemaining > 0 ? gapRemaining / weeksRemaining : gapRemaining;
  const projectedWeeks = velocity7d > 0 ? gapRemaining / velocity7d : Number.POSITIVE_INFINITY;
  const projectedDate =
    velocity7d > 0
      ? new Date(now + projectedWeeks * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'No projection (log more data)';

  return {
    gapRemaining,
    closedPercent,
    velocity7d,
    targetVelocity,
    weeksRemaining,
    projectedDate,
    velocityLabel
  };
}
