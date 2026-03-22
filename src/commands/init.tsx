import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import inquirer from 'inquirer';
import { SecretStore } from '../lib/secret-store.js';
import { storage } from '../lib/storage.js';
import { GoalsRepo } from '../data/repos/goals.repo.js';
import { ResourcesRepo } from '../data/repos/resources.repo.js';
import { PathsRepo } from '../data/repos/paths.repo.js';
import { ResourceMapper } from '../brain/resource-mapper.js';
import { PathGenerator } from '../brain/path-generator.js';
import { getProviderInstance, invokeModel } from '../lib/ai-provider.js';

export async function init() {
  console.log('\x1b[2J\x1b[0;0H');
  
  // 1. Goal + Current Status
  const baseAnswers = await inquirer.prompt([
    { name: 'statement', message: 'What is your goal (in plain English)?' },
    { name: 'current', message: 'What is your current number/value today?', validate: (v: string) => !isNaN(Number(v)) || 'Enter a number' },
    { type: 'list', name: 'provider', message: 'Select Intelligence layer:', choices: ['Anthropic', 'OpenAI', 'Groq', 'Ollama (Local)'] }
  ]);

  const providerKey = baseAnswers.provider === 'Ollama (Local)'
    ? 'ollama'
    : baseAnswers.provider.toLowerCase();

  if (providerKey !== 'ollama') {
    const { apiKey } = await inquirer.prompt([{
      type: 'password', name: 'apiKey', message: `Enter your ${baseAnswers.provider} API Key:`
    }]);
    SecretStore.set('opengoat', providerKey, apiKey);
  }
  await storage.set('preferred_provider', providerKey);

  // 2. Resource Mapping (5 Dimensions)
  console.log('\n--- GoatBrain 5D Resource Mapping ---');
  const resources = await inquirer.prompt([
    { name: 'time', message: '[Time] How many hours/day genuinely available? Peak hours? Days/week?' },
    { name: 'capital', message: '[Capital] Deployable cash right now? Monthly income? Willing to spend?' },
    { name: 'skills', message: '[Skills] What do you do well? Tools you use? Unfair advantage?' },
    { name: 'network', message: '[Network] Existing audience? Connections who have done this?' },
    { name: 'assets', message: '[Assets] Existing code, content, reputation, zero-cost leverage?' }
  ]);

  // Execute GoatBrain Core Loop
  const { waitUntilExit } = render(<InitProcessUI base={baseAnswers} resources={resources} />);
  await waitUntilExit();
}

const InitProcessUI = ({ base, resources }: { base: any, resources: any }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState('Booting GoatBrain...');
  const [paths, setPaths] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activePath, setActivePath] = useState<any | null>(null);

  useEffect(() => {
    async function process() {
      try {
        const provider = await getProviderInstance(base.provider);
        
        // Step 1: Parse Goal
        setStatus('Parsing natural language goal constraints...');
        const goalPrompt = ResourceMapper.generateGoalExtractionPrompt(base.statement);
        const rawGoalJson = await invokeModel(provider, goalPrompt);
        const parsedGoal = JSON.parse(rawGoalJson.replace(/```json|```/g, '').trim());
        
        // Step 2: Parse Resources
        setStatus('Mapping 5D organic resource profile...');
        const resPrompt = ResourceMapper.generateProfileExtractionPrompt(resources);
        const rawResJson = await invokeModel(provider, resPrompt);
        const parsedRes = JSON.parse(rawResJson.replace(/```json|```/g, '').trim());

        // Step 3: Save to DB
        const goalId = GoalsRepo.create({
          statement: parsedGoal.statement,
          category: parsedGoal.category || 'unknown',
          currentVal: Number(base.current),
          targetVal: parsedGoal.targetVal,
          unit: parsedGoal.unit,
          deadline: parsedGoal.deadline
        });
        ResourcesRepo.save(goalId, parsedRes);

        // Step 4: Generate Paths
        setStatus('Calculating top 5 fastest paths based on resources...');
        const pathPrompt = PathGenerator.generatePrompt(GoalsRepo.getById(goalId)!, parsedRes);
        const rawPathsJson = await invokeModel(provider, pathPrompt);
        const parsedPaths = JSON.parse(rawPathsJson.replace(/```json|```/g, '').trim());
        
        PathsRepo.savePaths(goalId, parsedPaths);
        
        setStatus('COMPLETE');
        setPaths(parsedPaths);
        await storage.set('active_goal_id', goalId);
        
      } catch (e: any) {
        setStatus(`FAILED: ${e.message}`);
      }
    }
    process();
  }, []);

  useInput((input, key) => {
    if (status !== 'COMPLETE' && !activePath) return;
    
    if (key.upArrow && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
    if (key.downArrow && selectedIndex < paths.length - 1) setSelectedIndex(selectedIndex + 1);
    
    if (key.return && !activePath) {
      const selected = paths[selectedIndex];
      const gid = storage.get<string>('active_goal_id');
      // AWAIT needed here in real code for storage.get if promise, but assuming cached sync for now or we manage state
      // We will just do it asynchronously and exit
      (async () => {
        const goalId = await storage.get<string>('active_goal_id');
        PathsRepo.activatePath(goalId!, selected.id);
        setActivePath(selected);
      })();
    }
    
    if (input === 'q') exit();
  });

  if (activePath) {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
        <Text bold color="green">PATH LOCKED: {activePath.name}</Text>
        <Box marginY={1}>
          <Text dimColor>{activePath.whyFastest}</Text>
        </Box>
        <Text bold color="yellow">First Action (Next 2 hours):</Text>
        <Text>{activePath.firstAction.description}</Text>
        <Box marginTop={1}><Text dimColor>Run 'opengoat paths' to view all options. Run 'opengoat log' to update your gap. Press Q to exit.</Text></Box>
      </Box>
    );
  }

  if (status !== 'COMPLETE') {
    return <Box padding={1}><Text>{status}</Text></Box>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">GOATBRAIN TOP 5 PATHS</Text>
      <Text dimColor>Select your operating context (Up/Down + Enter)</Text>
      
      <Box flexDirection="column" marginY={1}>
        {paths.map((p, i) => (
          <Text key={i} color={i === selectedIndex ? 'green' : 'white'}>
            {i === selectedIndex ? '❯ ' : '  '} 
            {p.rank}. {p.name} — {p.weeksToClose} weeks ({Math.round(p.confidenceScore)}% confidence)
          </Text>
        ))}
      </Box>
    </Box>
  );
};
