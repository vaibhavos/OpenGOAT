import { v4 as uuidv4 } from 'uuid';
import type { Goal } from '../types/goal.js';
import type { GoalPath } from '../types/path.js';
import type { Mission } from '../types/plugin.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function summarize(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.length > 48 ? `${trimmed.slice(0, 45).trimEnd()}...` : trimmed;
}

function getDifficulty(hours: number): 1 | 2 | 3 {
  if (hours <= 1.5) {
    return 1;
  }

  if (hours <= 4) {
    return 2;
  }

  return 3;
}

export function getGoalWeekNumber(goal: Goal, now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - goal.createdAt.getTime()) / WEEK_MS) + 1);
}

export function generateMissionsForPath(goal: Goal, path: GoalPath, week: number = getGoalWeekNumber(goal)): Mission[] {
  const missions: Mission[] = [];
  const milestoneHours = clamp(
    path.weeklyHoursRequired > 0
      ? path.weeklyHoursRequired / Math.max(2, Math.min(path.milestones.length || 1, 3))
      : 2,
    1,
    6
  );

  missions.push({
    id: uuidv4(),
    title: summarize(path.firstAction.description, `Start ${path.name}`),
    description: path.firstAction.description,
    estimatedHours: clamp(path.firstAction.timeRequired / 60 || 1, 0.5, 2),
    status: 'pending',
    week,
    pathId: path.id,
    goalId: goal.id,
    xp: 120,
    difficulty: getDifficulty(path.firstAction.timeRequired / 60 || 1),
    createdAt: new Date()
  });

  for (const milestone of path.milestones.slice(0, 3)) {
    missions.push({
      id: uuidv4(),
      title: summarize(milestone.description, `Advance milestone ${milestone.week}`),
      description: `${milestone.description} Target metric: ${milestone.metric} ${milestone.unit}.`,
      estimatedHours: milestoneHours,
      status: 'pending',
      week,
      pathId: path.id,
      goalId: goal.id,
      xp: 150,
      difficulty: getDifficulty(milestoneHours),
      createdAt: new Date()
    });
  }

  missions.push({
    id: uuidv4(),
    title: 'Review velocity and adjust',
    description: `Review progress on "${goal.statement}", compare results against ${path.name}, and update your next move.`,
    estimatedHours: 1,
    status: 'pending',
    week,
    pathId: path.id,
    goalId: goal.id,
    xp: 100,
    difficulty: 1,
    createdAt: new Date()
  });

  return missions;
}
