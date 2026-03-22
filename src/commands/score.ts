import { GoalsRepo } from '../data/repos/goals.repo.js';
import { GapsRepo } from '../data/repos/gaps.repo.js';
import { PathsRepo } from '../data/repos/paths.repo.js';
import { ScoresRepo } from '../data/repos/scores.repo.js';
import { storage } from '../lib/storage.js';
import { calculateProgress } from '../lib/progress.js';
import chalk from 'chalk';

export async function scoreWeek() {
  const goalId = await storage.get<string>('active_goal_id');
  if (!goalId) {
    console.log(chalk.red('No active goal. Run `opengoat init` first.'));
    return;
  }

  const goal = GoalsRepo.getById(goalId);
  const activePath = PathsRepo.getActivePath(goalId);
  const history = GapsRepo.getSeries(goalId);
  
  if (!goal || !activePath) return;

  console.log(chalk.cyan(`\nSCORING WEEK ENDING: ${new Date().toISOString().split('T')[0]}`));

  const progress = calculateProgress(goal, history);
  
  const velocityScore = progress.targetVelocity > 0
    ? Math.min(100, Math.max(0, (progress.velocity7d / progress.targetVelocity) * 100))
    : 100;
  const consistency = history.length > 5 ? 85 : 40; // Mock derived consistency
  const momentum = progress.velocity7d > 0 ? 90 : 20;        // Mock momentum curve
  const pathFit = 95;                               // Direct active path alignment
  
  const total = (velocityScore * 0.4) + (consistency * 0.3) + (momentum * 0.2) + (pathFit * 0.1);
  const xpEarnt = Math.round(total * 10);
  
  let rank: 'Recruit' | 'Operator' | 'Ghost' | 'Apex' = 'Recruit';
  if (total >= 90) rank = 'Apex';
  else if (total >= 70) rank = 'Ghost';
  else if (total >= 40) rank = 'Operator';

  const scoreEntry = {
    goalId,
    weekNumber: ScoresRepo.getScores(goalId).length + 1,
    velocityScore,
    consistency,
    momentum,
    pathFit,
    total,
    rank,
    xp: xpEarnt,
    gapAtWeek: progress.gapRemaining
  };

  ScoresRepo.saveWeekScore(scoreEntry);

  console.log(chalk.hex('#EF9F27')(`\nVelocity Score  : ${Math.round(velocityScore)} / 100`));
  console.log(chalk.hex('#EF9F27')(`Consistency     : ${consistency} / 100`));
  console.log(chalk.hex('#EF9F27')(`Momentum        : ${momentum} / 100`));
  console.log(chalk.hex('#EF9F27')(`Path Fit        : ${pathFit} / 100`));
  console.log(chalk.green(`\nTOTAL SCORE     : ${Math.round(total)}`));
  console.log(chalk.green(`RANK EARNED     : ${rank}`));
  console.log(chalk.green(`XP GAINED       : +${xpEarnt} XP`));
  console.log(chalk.dim(`\nRun 'opengoat share' to generate your viral scorecard.\n`));
}
