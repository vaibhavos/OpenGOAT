import React from 'react';
import { render, Box, Text } from 'ink';
import { GoalsRepo } from '../data/repos/goals.repo.js';
import { PathsRepo } from '../data/repos/paths.repo.js';
import { GapsRepo } from '../data/repos/gaps.repo.js';
import { ScoresRepo } from '../data/repos/scores.repo.js';
import { storage } from '../lib/storage.js';
import { GapMeter } from '../../packages/ink-ui/src/index.js';
import { calculateProgress } from '../lib/progress.js';
import chalk from 'chalk';

export async function liveDashboard() {
  const goalId = await storage.get<string>('active_goal_id');
  if (!goalId) {
    console.log(chalk.red('No active goal. Run `opengoat init` first.'));
    return;
  }

  const goal = GoalsRepo.getById(goalId);
  if (!goal) return;
  const path = PathsRepo.getActivePath(goalId);
  const history = GapsRepo.getSeries(goalId);
  const scores = ScoresRepo.getScores(goalId, 4);

  render(<DashboardUI goal={goal} path={path} scores={scores} history={history} />);
}

const DashboardUI = ({ goal, path, scores, history }: any) => {
  const progress = calculateProgress(goal, history);
  const rank = scores.length > 0 ? scores[0].rank : 'UNRANKED';
  const totalXp = scores.reduce((sum: number, s: any) => sum + s.xp, 0);

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="#EF9F27">
      <Text bold color="#EF9F27">OPENGOAT COCKPIT</Text>
      
      <Box marginY={1}>
        <GapMeter current={goal.currentVal} target={goal.targetVal} unit={goal.unit} />
      </Box>

      <Text dimColor>Goal: {goal.statement}</Text>
      <Text dimColor>Deadline: {goal.deadline} ({Math.round(progress.closedPercent)}% Closed)</Text>
      <Text dimColor>Remaining: {progress.gapRemaining} {goal.unit}</Text>
      <Text dimColor>Velocity: {progress.velocityLabel}</Text>
      <Text dimColor>Projected completion: {progress.projectedDate}</Text>

      <Box flexDirection="column" marginTop={1} padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="yellow">ACTIVE STRATEGY</Text>
        <Text>{path ? path.name : 'None Selected (Run `opengoat paths`)'}</Text>
        {path && <Text dimColor>{path.tagline}</Text>}
      </Box>

      <Box flexDirection="column" marginTop={1} padding={1} borderStyle="round" borderColor="green">
        <Text bold color="green">OPERATOR STATS</Text>
        <Text>Current Rank: {rank}</Text>
        <Text>Total XP: {totalXp}</Text>
        <Text>Logs: {history.length} entries</Text>
      </Box>
    </Box>
  );
};
