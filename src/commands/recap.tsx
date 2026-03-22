import React from 'react';
import { render, Box, Text } from 'ink';
import { MissionsRepo } from '../data/repos/missions.repo.js';
import { GoalsRepo } from '../data/repos/goals.repo.js';
import { getGoalWeekNumber } from '../lib/mission-planner.js';
import { calculateScore } from '../lib/score-engine.js';

export async function weeklyRecap() {
  const goals = GoalsRepo.getAllActive();
  if (goals.length === 0) return;

  for (const goal of goals) {
    const week = getGoalWeekNumber(goal);
    const missions = MissionsRepo.getByGoal(goal.id, week);
    const score = calculateScore(missions as any, week);
    const total = missions.length;
    const completed = missions.filter((m: any) => m.status === 'complete').length;
    const missed = missions.filter((m: any) => m.status === 'missed').length;

    render(
      <Box flexDirection="column" borderStyle="double" borderColor="yellow" padding={1} marginY={1}>
        <Text bold inverse color="yellow"> WEEK {week} RECAP: {goal.statement.toUpperCase()} </Text>
        <Box marginTop={1}>
          <Text color="green">SUCCESS: {completed} missions crushed</Text>
        </Box>
        <Box>
          <Text color="red">MISSED: {missed} protocols drifted</Text>
        </Box>
        <Box marginTop={1}>
          <Text bold>FINAL SCORE: {score.total} ({score.rank})</Text>
        </Box>
      </Box>
    );
  }
}
