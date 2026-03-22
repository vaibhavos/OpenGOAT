#!/usr/bin/env node
import { Command } from 'commander';
import { init } from './commands/init.js';
import { logNumber } from './commands/log.js';
import { showPaths } from './commands/paths.js';
import { showGap } from './commands/gap.js';
import { updateResources } from './commands/resources.js';
import { scoreWeek } from './commands/score.js';
import { shareCard } from './commands/share.js';
import { analyzeGoal } from './commands/analyze.js';
import { liveDashboard } from './commands/dashboard.js';
import { startServer } from './commands/serve.js';
import { resetData } from './commands/reset.js';
import { startInteractive } from './commands/interactive.js';
import { showMissions } from './commands/missions.js';
import { weeklyRecap } from './commands/recap.js';
import { doctorCommand } from './commands/doctor.js';
import { answerWhy } from './commands/why.js';
import { loadLocalSkills } from './lib/skills-registry.js';

const program = new Command();

program
  .name('opengoat')
  .description('The GOAT Operating System for Goals v1')
  .version('1.0.0')
  .showHelpAfterError()
  .action(() => {
    program.outputHelp();
  });

program.command('init').description('Setup wizard and 5D resource mapping').action(init);
program.command('log <number>').description('Log your current number towards the gap').action((n) => logNumber(Number(n)));
program.command('paths').description('View and select GoatBrain generated paths').action(showPaths);
program.command('gap').description('View current gap velocity and interventions').action(showGap);
program.command('why [response]').description('Resolve the current intervention block').action(answerWhy);
program.command('resources').description('Update your 5D resources and re-calculate paths').action(updateResources);
program.command('score').description('Calculate weekly OS operator score').action(scoreWeek);
program.command('share').description('Generate shareable HTML scorecard').action(shareCard);
program.command('analyze').description('Cross-goal correlation logic').action(analyzeGoal);
program.command('dashboard').description('Live terminal cockpit UI').action(liveDashboard);
program.command('interactive').description('Launch the experimental full-screen shell').action(startInteractive);
program.command('serve').description('Start Plugin API layer').action(startServer);
program.command('reset').description('Nuclear data purge').action(resetData);
program.command('missions [action] [id]').description('View protocol missions and XP progress').action(showMissions);
program.command('recap').description('Weekly performance recap and insights').action(weeklyRecap);
program.addCommand(doctorCommand);

(async () => {
  await loadLocalSkills();
  await program.parseAsync(process.argv);
})();
