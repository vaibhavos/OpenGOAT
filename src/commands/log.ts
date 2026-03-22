import { GoalsRepo } from '../data/repos/goals.repo.js';
import { GapsRepo } from '../data/repos/gaps.repo.js';
import { storage } from '../lib/storage.js';
import { GapWatcher } from '../brain/gap-watcher.js';
import { InterventionsRepo } from '../data/repos/interventions.repo.js';
import { calculateProgress } from '../lib/progress.js';
import chalk from 'chalk';

export async function logNumber(value: number) {
  if (!Number.isFinite(value)) {
    console.log(chalk.red('Invalid number. Example: `opengoat log 1250`'));
    return;
  }

  const goalId = await storage.get<string>('active_goal_id');
  if (!goalId) {
    console.log(chalk.red('No active goal. Run `opengoat init` first.'));
    return;
  }

  const goal = GoalsRepo.getById(goalId);
  if (!goal) {
    console.log(chalk.red('Active goal not found in the local database.'));
    return;
  }

  // 1. Log the new number natively via GapsRepo
  GapsRepo.log(goalId, value);
  GoalsRepo.updateCurrentValue(goalId, value);

  // 2. Retrieve history and calculate velocity
  const history = GapsRepo.getSeries(goalId);
  const now = Date.now();
  const progress = calculateProgress(goal, history, value, now);

  console.log(`\nGap updated -> ${value} ${goal.unit}`);
  console.log(`Gap remaining: ${progress.gapRemaining} ${goal.unit}`);
  console.log(`Closed: ${progress.closedPercent}%`);
  console.log(`Velocity: ${progress.velocityLabel} (need ${Math.round(progress.targetVelocity)}/week)`);
  console.log(`Projected completion: ${progress.projectedDate}`);

  const mockStatus = {
    current: value, target: goal.targetVal, unit: goal.unit,
    percentClosed: progress.closedPercent, gap: progress.gapRemaining,
    velocity7d: progress.velocity7d, velocity30d: progress.velocity7d * 4, targetVelocity: progress.targetVelocity,
    projectedWeeks: progress.velocity7d > 0 ? (progress.gapRemaining / progress.velocity7d) : 999,
    status: (progress.velocity7d >= progress.targetVelocity) ? 'on-track' : 'behind' as any,
    daysSinceMovement: history.length > 1 ? (now - history[history.length - 2].loggedAt.getTime()) / 86400000 : 0,
    projectedCompletionDate: progress.projectedDate,
    isBehindSchedule: progress.velocity7d < progress.targetVelocity
  };

  // 3. GoatBrain Watcher Evaluation
  const decision = GapWatcher.evaluateGap(mockStatus);

  if (decision === 'silent') {
    // Zero footprint output, execution phase pure.
  } else if (decision === 'watching') {
    const question = GapWatcher.generateWatchingQuestion(mockStatus);
    console.log(chalk.yellow(`\n[GoatBrain] -> ${question}`));
    console.log(chalk.dim(`(Type 'opengoat why' to answer and trigger a constraint block resolution)`));
    
    // Stash intervention state
    InterventionsRepo.create({
      goalId,
      triggeredBy: 'stalled-48h',
      question,
      userResponse: '',
      constraintType: 'clarity',
      unlockAction: ''
    });
  } else if (decision === 'intervening') {
    console.log(chalk.red(`\n[CRISIS MODE] Your gap has stalled critically. The protocol must be reset.`));
    console.log(chalk.dim(`(Run 'opengoat gap' to view full intervention options.)`));
  }
}
