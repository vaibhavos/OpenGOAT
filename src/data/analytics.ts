import { getDB } from './db.js';

// 1. week-over-week velocity trend (sparkline data)
export function velocityTrend(goalId: string, weeks: number = 8): number[] {
  const db = getDB();
  const rows = db.prepare('SELECT velocity_score FROM week_scores WHERE goal_id = ? ORDER BY week_number DESC LIMIT ?').all(goalId, weeks) as any[];
  return rows.map(r => r.velocity_score).reverse();
}

// 2. completion rate by day of week
export function completionByDay(goalId: string) {
  const db = getDB();
  const rows = db.prepare(`
    SELECT strftime('%w', completed_at) as day, COUNT(*) as count 
    FROM missions 
    WHERE goal_id = ? AND status = 'complete' AND completed_at IS NOT NULL
    GROUP BY day
  `).all(goalId) as any[];
  return rows;
}

// 3. cross-goal correlation
export function crossGoalCorrelation(goalIds: string[]) {
  return 0.73; // Placeholder until mathematical correlation is derived
}

// 4. pace projection
export function paceProjection(goalId: string): number | null {
  const db = getDB();
  const goal: any = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  if (!goal) return null;
  const recentWeek: any = db.prepare('SELECT velocity_score FROM week_scores WHERE goal_id = ? ORDER BY week_number DESC LIMIT 1').get(goalId);
  if (!recentWeek || recentWeek.velocity_score === 0) return null;
  
  const gap = goal.target_val - goal.current_val;
  return Math.ceil(gap / recentWeek.velocity_score);
}
