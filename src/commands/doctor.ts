import { Command } from 'commander';
import chalk from 'chalk';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { SecretStore } from '../lib/secret-store.js';
import { getProviderInstance } from '../lib/ai-provider.js';
import { getDatabasePath } from '../data/db.js';

export const doctorCommand = new Command('doctor')
  .description('Run diagnostic health checks on the OpenGOAT system')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🩺 OpenGOAT System Doctor'));
    console.log(chalk.dim('========================================='));

    let errors = 0;
    let warnings = 0;

    const check = (name: string, status: 'OK' | 'WARN' | 'FAIL', message?: string) => {
      const icon = status === 'OK' ? chalk.green('✓') : status === 'WARN' ? chalk.yellow('⚠') : chalk.red('✗');
      const color = status === 'OK' ? chalk.green : status === 'WARN' ? chalk.yellow : chalk.red;
      console.log(`${icon} ${chalk.bold(name)}: ${color(status)}`);
      if (message) console.log(`   ${chalk.dim(message)}`);
      if (status === 'WARN') warnings++;
      if (status === 'FAIL') errors++;
    };

    // 1. Check Directories
    const openGoatDir = path.join(os.homedir(), '.opengoat');
    try {
      if (!fs.existsSync(openGoatDir)) {
        check('Home Directory', 'WARN', `~/.opengoat does not exist. It will be created automatically.`);
      } else {
        const stats = fs.statSync(openGoatDir);
        // Simple write access check
        fs.accessSync(openGoatDir, fs.constants.W_OK);
        check('Home Directory', 'OK', `~/.opengoat is accessible.`);
      }
    } catch (e: any) {
      check('Home Directory', 'FAIL', `Cannot access ~/.opengoat: ${e.message}`);
    }

    // 2. Check Database
    try {
      const dbPath = getDatabasePath();
      if (fs.existsSync(dbPath)) {
        // Just verify we can instantiate it without throwing
        const sqlite = new Database(dbPath, { fileMustExist: true });
        const goalCount = sqlite.prepare('SELECT COUNT(*) as count FROM goals').get() as { count: number };
        check('Database', 'OK', `Connected to ${path.basename(dbPath)}. Found ${goalCount.count} goals.`);
        sqlite.close();
      } else {
        check('Database', 'WARN', `${path.basename(dbPath)} does not exist yet. Run 'opengoat init'.`);
      }
    } catch (e: any) {
      check('Database', 'FAIL', `Database connection failed: ${e.message}`);
    }

    // 3. Check API Keys (SecretStore)
    let activeProviders: string[] = [];
    try {
      const groqKey = SecretStore.get('opengoat', 'groq');
      const anthropicKey = SecretStore.get('opengoat', 'anthropic');
      const openaiKey = SecretStore.get('opengoat', 'openai');
      const ollamaKey = SecretStore.get('opengoat', 'ollama');

      const activeKeys = [
        groqKey ? 'groq' : null,
        anthropicKey ? 'anthropic' : null,
        openaiKey ? 'openai' : null,
        ollamaKey ? 'ollama' : null
      ].filter(Boolean) as string[];

      activeProviders = activeKeys;

      if (activeKeys.length > 0) {
        check('Secret Store', 'OK', `Found configurations for: ${activeKeys.join(', ')}`);
      } else {
        check('Secret Store', 'WARN', `No API keys configured. Run 'opengoat init' to set up an AI provider.`);
      }
    } catch (e: any) {
      check('Secret Store', 'FAIL', `Failed to access SecretStore: ${e.message}`);
    }

    // 4. Check AI Connectivity (Optional/Latency Ping)
    console.log(chalk.dim('\nProbing AI Provider connectivity...'));
    try {
      if (activeProviders.length > 0) {
        const testProvider = activeProviders[0];
        const provider = await getProviderInstance(testProvider);
        const start = Date.now();
        // A very cheap "ping" prompt
        const response = await provider.complete('Reply exactly with the word "pong". Output no other text.');
        const latency = Date.now() - start;
        
        if (response && response.toLowerCase().includes('pong')) {
          check(`AI Connection (${testProvider})`, 'OK', `Provider responded in ${latency}ms. (${response.trim()})`);
        } else {
          check(`AI Connection (${testProvider})`, 'WARN', `Provider responded but output was unexpected: ${response}`);
        }
      } else {
         check('AI Connection', 'WARN', `Skipped probe. No AI provider configured.`);
      }
    } catch (e: any) {
      check('AI Connection', 'FAIL', `AI connectivity test failed: ${e.message}`);
    }

    console.log(chalk.dim('\n========================================='));
    if (errors === 0 && warnings === 0) {
      console.log(chalk.bold.green('All systems nominal. OpenGOAT is ready.'));
    } else {
      console.log(chalk.bold(`Diagnosis complete with ${chalk.red(errors + ' errors')} and ${chalk.yellow(warnings + ' warnings')}.`));
    }
    
    // Process exit with code 1 if errors found, otherwise 0
    process.exit(errors > 0 ? 1 : 0);
  });
