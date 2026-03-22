import { getDB } from '../data/db.js';
import { storage } from '../lib/storage.js';
import chalk from 'chalk';

export async function resetData() {
  console.log(chalk.red.bold('NUCLEAR PURGE INITIATED'));
  const db = getDB();
  db.transaction(() => {
    db.prepare('DELETE FROM gap_log').run();
    db.prepare('DELETE FROM interventions').run();
    db.prepare('DELETE FROM missions').run();
    db.prepare('DELETE FROM week_scores').run();
    db.prepare('DELETE FROM paths').run();
    db.prepare('DELETE FROM resource_profiles').run();
    db.prepare('DELETE FROM goals').run();
  })();
  await storage.set('active_goal_id', null);
  console.log(chalk.green('All local GoatOS data deleted.'));
}
