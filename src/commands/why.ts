import inquirer from 'inquirer';
import chalk from 'chalk';
import { storage } from '../lib/storage.js';
import { InterventionsRepo } from '../data/repos/interventions.repo.js';
import { resolveInterventionResponse } from '../lib/intervention-resolver.js';

export async function answerWhy(responseArg?: string) {
  const goalId = await storage.get<string>('active_goal_id');
  if (!goalId) {
    console.log(chalk.red('No active goal. Run `opengoat init` first.'));
    return;
  }

  const unresolved = InterventionsRepo.getUnresolved(goalId);
  if (unresolved.length === 0) {
    console.log(chalk.dim('No active intervention. Keep executing.'));
    return;
  }

  const intervention = unresolved[0];
  let response = responseArg?.trim();

  if (!response) {
    console.log(chalk.yellow(`\n[GoatBrain] ${intervention.question}`));
    const answers = await inquirer.prompt([
      {
        name: 'response',
        message: 'What is the real blocker right now?'
      }
    ]);
    response = answers.response.trim();
  }

  if (!response) {
    console.log(chalk.dim('No response captured. Aborting.'));
    return;
  }

  const resolution = resolveInterventionResponse(response);
  InterventionsRepo.update(intervention.id, {
    userResponse: response,
    constraintType: resolution.constraintType,
    unlockAction: resolution.unlockAction,
    resolved: true
  });

  console.log(chalk.green('\nIntervention resolved.'));
  console.log(chalk.dim(`Constraint type: ${resolution.constraintType}`));
  console.log(chalk.bold(`Next unlock action: ${resolution.unlockAction}\n`));
}
