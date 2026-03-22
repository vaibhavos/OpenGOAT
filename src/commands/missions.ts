import chalk from 'chalk';
import { GoalsRepo } from '../data/repos/goals.repo.js';
import { MissionsRepo } from '../data/repos/missions.repo.js';
import { PathsRepo } from '../data/repos/paths.repo.js';
import { storage } from '../lib/storage.js';
import { generateMissionsForPath, getGoalWeekNumber } from '../lib/mission-planner.js';

function statusIcon(status: 'pending' | 'complete' | 'missed'): string {
  if (status === 'complete') return chalk.green('[✓]');
  if (status === 'pending') return chalk.yellow('[→]');
  return chalk.red('[×]');
}

function resolveMissionId(goalId: string, partialId: string): string | null {
  const missions = MissionsRepo.getAllByGoal(goalId);
  const exact = missions.find((mission) => mission.id === partialId);
  if (exact) {
    return exact.id;
  }

  const prefixMatches = missions.filter((mission) => mission.id.startsWith(partialId));
  if (prefixMatches.length === 1) {
    return prefixMatches[0].id;
  }

  return null;
}

function ensureCurrentWeekMissions(goalId: string, goal: NonNullable<ReturnType<typeof GoalsRepo.getById>>) {
  const week = getGoalWeekNumber(goal);
  let missions = MissionsRepo.getByGoal(goalId, week);
  let generated = false;

  if (missions.length === 0) {
    const activePath = PathsRepo.getActivePath(goalId);
    if (!activePath) {
      return { missions, week, generated, activePath: null };
    }

    missions = generateMissionsForPath(goal, activePath, week);
    MissionsRepo.createMany(missions);
    generated = true;
  }

  return {
    missions,
    week,
    generated,
    activePath: PathsRepo.getActivePath(goalId)
  };
}

export async function showMissions(action?: string, missionId?: string) {
  const goalId = await storage.get<string>('active_goal_id');
  if (!goalId) {
    console.log(chalk.red('\n No active goal. Run `opengoat init` first.\n'));
    return;
  }

  const goal = GoalsRepo.getById(goalId);
  if (!goal) {
    console.log(chalk.red('\n Active goal not found in the local database.\n'));
    return;
  }

  // If completing a mission natively
  if (action === 'complete' && missionId) {
    const resolvedId = resolveMissionId(goalId, missionId);
    if (!resolvedId) {
      console.log(chalk.red(`\n Mission ${missionId} was not found. Use the shown 8-character ID prefix.\n`));
      return;
    }

    MissionsRepo.markComplete(resolvedId);
    console.log(chalk.green(`\n✓ Mission ${resolvedId.slice(0, 8)} complete!`));
    // XP is implicitly handled natively by SQL evaluation in the score engine
    return;
  }

  if (action === 'missed' && missionId) {
    const resolvedId = resolveMissionId(goalId, missionId);
    if (!resolvedId) {
      console.log(chalk.red(`\n Mission ${missionId} was not found. Use the shown 8-character ID prefix.\n`));
      return;
    }

    MissionsRepo.markMissed(resolvedId);
    console.log(chalk.yellow(`\n! Mission ${resolvedId.slice(0, 8)} marked missed.`));
    return;
  }

  const { missions, week, generated, activePath } = ensureCurrentWeekMissions(goalId, goal);

  if (missions.length === 0) {
    console.log(chalk.dim('\n No generated missions found for this goal. Select an active path with `opengoat paths` first.\n'));
    return;
  }

  const completeCount = missions.filter(m => m.status === 'complete').length;
  const totalXPEarned = missions.filter(m => m.status === 'complete').reduce((sum, m) => sum + m.xp, 0);
  const totalXPAvail = missions.reduce((sum, m) => sum + m.xp, 0);

  console.log('\n' + chalk.hex('#EF9F27').bold(`  ◢ MISSION BOARD — ${goal.statement}`));
  console.log(chalk.dim(`  Week ${week} · Path: ${activePath?.name || 'None selected'} · Progress: ${completeCount}/${missions.length} missions · ${totalXPEarned} XP earned`));
  if (generated) {
    console.log(chalk.green('  Generated this week\'s mission set from your active path.\n'));
  } else {
    console.log('');
  }

  for (const mission of missions) {
    const icon = statusIcon(mission.status);
    const titleColor = mission.status === 'complete' ? chalk.dim : chalk.white.bold;
    const xpColor =
      mission.status === 'complete' ? chalk.green :
      mission.status === 'missed' ? chalk.red :
      chalk.dim;
    
    console.log(`  ${icon} ${titleColor(mission.title.padEnd(30))} ${xpColor(`+${mission.xp} XP`)}  ${chalk.dim(`(ID: ${mission.id.slice(0, 8)})`)}`);
    if (mission.status !== 'complete') {
      console.log(chalk.dim(`      ${mission.description}`));
    }
  }

  const pct = Math.round((completeCount / Math.max(1, missions.length)) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  console.log('\n' + chalk.dim(`  [${bar}] ${pct}% Mission Complete`));
  console.log(chalk.hex('#1D9E75')(`  Total XP Pool: ${totalXPAvail} XP available\n`));
  
  if (completeCount < missions.length) {
    console.log(chalk.dim(`  To complete a mission: opengoat missions complete <ID>`));
    console.log(chalk.dim(`  To mark one missed:     opengoat missions missed <ID>`));
  }
}
